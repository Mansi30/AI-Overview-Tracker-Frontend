import { useState, useEffect } from 'react';
import { collectionGroup, getDocs, collection, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export const useDashboardData = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user and their role
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Not authenticated');
        }

        // Use Firebase Auth UID directly as the userId
        const currentUserId = currentUser.uid;
        
        // Try to get user document to fetch role
        const userDocRef = doc(db, 'users', currentUserId);
        const userDocSnap = await getDoc(userDocRef);
        
        let role = 'user'; // default
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          role = userData.role || 'user';
        }

        setUserRole(role);

        console.log('Dashboard loading for user:', currentUserId, 'Role:', role);

        // Fetch events plus language collections based on role
        let events = [];
        let englishComparisons = [];
        let indonesianComparisons = [];

        const normalizeCitationEntry = (source, classificationMap) => {
          if (!source) return null;

          if (typeof source === 'string') {
            const normalizedUrl = source.trim();
            return {
              label: source,
              url: normalizedUrl.startsWith('http') ? normalizedUrl : '',
              classification: classificationMap[normalizedUrl.toLowerCase()] || null
            };
          }

          if (typeof source === 'object') {
            const url = (source.url || source.link || '').trim();
            const label = source.text || source.title || source.domain || url || 'Untitled citation';
            const explicitClassification =
              source.outlet_type ||
              source.outlet_classification ||
              source.outletClassification ||
              source.classification ||
              source.outletType ||
              null;

            return {
              label,
              url,
              classification: explicitClassification || classificationMap[url.toLowerCase()] || null
            };
          }

          return null;
        };

        const extractCitations = (data) => {
          const rawClassificationMap = data.outlet_classifications || data.url_classifications || {};
          const classificationMap = Object.entries(rawClassificationMap).reduce((acc, [url, label]) => {
            if (typeof url === 'string' && typeof label === 'string') {
              acc[url.trim().toLowerCase()] = label.trim().toLowerCase();
            }
            return acc;
          }, {});

          const rawSources = [
            ...(Array.isArray(data.cited_sources) ? data.cited_sources : []),
            ...(Array.isArray(data.citations) ? data.citations : []),
            ...(Array.isArray(data.sources) ? data.sources : []),
            ...(Array.isArray(data.citation_urls) ? data.citation_urls : [])
          ];

          const dedupe = new Set();
          const normalized = [];

          rawSources.forEach((source) => {
            const citation = normalizeCitationEntry(source, classificationMap);
            if (!citation || !citation.label) return;

            const key = `${citation.label}|${citation.url}`;
            if (!dedupe.has(key)) {
              dedupe.add(key);
              normalized.push(citation);
            }
          });

          return normalized;
        };

        const normalizeComparisonDocs = (snapshot, userIdResolver, language) => (
          snapshot.docs.map((snapshotDoc) => {
            const data = snapshotDoc.data();
            const citations = Number(data.citation_count);
            const userId = userIdResolver(snapshotDoc);

            return {
              query: (data.query || '').trim(),
              citation_count: Number.isFinite(citations) ? citations : 0,
              citations: extractCitations(data),
              docId: snapshotDoc.id,
              userId,
              language
            };
          }).filter((entry) => entry.query)
        );

        if (role === 'admin') {
          // Admin: fetch ALL user docs from events/en/in subcollections.
          const [eventsSnapshot, englishSnapshot, indonesianSnapshot] = await Promise.all([
            getDocs(collectionGroup(db, 'events')),
            getDocs(collectionGroup(db, 'en')),
            getDocs(collectionGroup(db, 'in'))
          ]);

          events = eventsSnapshot.docs.map((snapshotDoc) => ({
            ...snapshotDoc.data(),
            docId: snapshotDoc.id,
            userId: snapshotDoc.ref.parent.parent?.id || 'unknown' // Extract user ID from path
          }));

          englishComparisons = normalizeComparisonDocs(
            englishSnapshot,
            (snapshotDoc) => snapshotDoc.ref.parent.parent?.id || 'unknown',
            'en'
          );

          indonesianComparisons = normalizeComparisonDocs(
            indonesianSnapshot,
            (snapshotDoc) => snapshotDoc.ref.parent.parent?.id || 'unknown',
            'in'
          );
        } else {
          // Regular user: fetch only docs under users/{uid}/events|en|in
          if (currentUserId) {
            const userEventsCollection = collection(db, 'users', currentUserId, 'events');
            const userEnglishCollection = collection(db, 'users', currentUserId, 'en');
            const userIndonesianCollection = collection(db, 'users', currentUserId, 'in');

            const [userEventsSnapshot, userEnglishSnapshot, userIndonesianSnapshot] = await Promise.all([
              getDocs(userEventsCollection),
              getDocs(userEnglishCollection),
              getDocs(userIndonesianCollection)
            ]);

            events = userEventsSnapshot.docs.map((snapshotDoc) => ({
              ...snapshotDoc.data(),
              docId: snapshotDoc.id,
              userId: currentUserId
            }));

            englishComparisons = normalizeComparisonDocs(
              userEnglishSnapshot,
              () => currentUserId,
              'en'
            );

            indonesianComparisons = normalizeComparisonDocs(
              userIndonesianSnapshot,
              () => currentUserId,
              'in'
            );
          }
        }

        // Aggregate EN and IN citations into one row per query.
        const comparisonByQuery = {};
        const addComparisonData = (records, languageKey) => {
          records.forEach((record) => {
            const normalizedQuery = record.query.toLowerCase();
            if (!comparisonByQuery[normalizedQuery]) {
              comparisonByQuery[normalizedQuery] = {
                query: record.query,
                enCitations: 0,
                inCitations: 0
              };
            }

            if (languageKey === 'en') {
              comparisonByQuery[normalizedQuery].enCitations += record.citation_count;
            } else {
              comparisonByQuery[normalizedQuery].inCitations += record.citation_count;
            }
          });
        };

        addComparisonData(englishComparisons, 'en');
        addComparisonData(indonesianComparisons, 'in');

        const languageComparisonRows = Object.values(comparisonByQuery)
          .map((row) => ({
            ...row,
            totalCitations: row.enCitations + row.inCitations
          }))
          .sort((a, b) => b.totalCitations - a.totalCitations);

        const totalEnCitations = languageComparisonRows.reduce(
          (sum, row) => sum + row.enCitations,
          0
        );

        const totalInCitations = languageComparisonRows.reduce(
          (sum, row) => sum + row.inCitations,
          0
        );

        const aggregateLanguageQueries = (records) => {
          const queries = {};

          records.forEach((record) => {
            const key = record.docId;
            if (!queries[key]) {
              queries[key] = {
                query: record.query,
                citationCount: 0,
                citations: [],
                sourceDocs: []
              };
            }

            queries[key].citationCount += record.citation_count;

            const existingCitations = new Set(
              queries[key].citations.map((citation) => `${citation.label}|${citation.url}`)
            );

            record.citations.forEach((citation) => {
              const citationKey = `${citation.label}|${citation.url}`;
              if (!existingCitations.has(citationKey)) {
                existingCitations.add(citationKey);
                queries[key].citations.push(citation);
              }
            });

            const sourceDocKey = `${record.userId}|${record.docId}`;
            const existingSourceDoc = queries[key].sourceDocs.find(
              (sourceDoc) => `${sourceDoc.userId}|${sourceDoc.docId}` === sourceDocKey
            );

            if (!existingSourceDoc) {
              queries[key].sourceDocs.push({
                userId: record.userId,
                docId: record.docId,
                language: record.language,
                query: record.query,
                urls: Array.from(
                  new Set(
                    record.citations
                      .map((citation) => citation.url)
                      .filter((url) => typeof url === 'string' && url.trim().length > 0)
                  )
                )
              });
            } else {
              const mergedUrls = new Set(existingSourceDoc.urls);
              record.citations.forEach((citation) => {
                if (citation.url) {
                  mergedUrls.add(citation.url);
                }
              });
              existingSourceDoc.urls = Array.from(mergedUrls);
            }
          });

          return Object.values(queries).sort((a, b) => b.citationCount - a.citationCount);
        };

        const englishQueries = aggregateLanguageQueries(englishComparisons);
        const indonesianQueries = aggregateLanguageQueries(indonesianComparisons);

        // Compute local vs global outlet type counts per language
        const countOutletTypes = (queries) => {
          let local = 0;
          let global = 0;
          queries.forEach((q) => {
            q.citations.forEach((c) => {
              const type = (c.classification || '').toLowerCase().trim();
              if (type === 'local') local++;
              else if (type === 'global') global++;
            });
          });
          return { local, global };
        };

        const enOutletCounts = countOutletTypes(englishQueries);
        const inOutletCounts = countOutletTypes(indonesianQueries);
        const maxLanguageRows = Math.max(englishQueries.length, indonesianQueries.length);
        const languageQueryPairs = Array.from({ length: maxLanguageRows }, (_, index) => ({
          en: englishQueries[index] || null,
          in: indonesianQueries[index] || null
        }));

        // Calculate statistics
        const aiOverviewEvents = events.filter(e => e.event_type === 'ai_overview_shown');
        const clickEvents = events.filter(e => e.event_type === 'citation_clicked');
        const totalSearches = events.filter(e =>
          e.event_type === 'ai_overview_shown' || e.event_type === 'search_without_ai_overview'
        ).length;

        // Domain analysis with REAL click tracking
        const domainMap = {};
        
        // First, gather all cited domains
        aiOverviewEvents.forEach(e => {
          if (e.cited_sources) {
            e.cited_sources.forEach(source => {
              if (!domainMap[source.domain]) {
                domainMap[source.domain] = {
                  domain: source.domain,
                  citations: 0,
                  clicks: 0,
                  urls: new Set(),
                  ctr: 0
                };
              }
              domainMap[source.domain].citations++;
              domainMap[source.domain].urls.add(source.url);
            });
          }
        });

        // Then, match clicks from click events
        clickEvents.forEach(e => {
          if (e.citation_domain && domainMap[e.citation_domain]) {
            domainMap[e.citation_domain].clicks++;
          }
        });

        const domains = Object.values(domainMap)
          .map(d => ({
            ...d,
            urls: Array.from(d.urls),
            ctr: d.citations > 0 ? ((d.clicks / d.citations) * 100).toFixed(1) : 0
          }))
          .sort((a, b) => b.citations - a.citations)
          .slice(0, 15);

        // Query TOPIC analysis
        const topicMap = {};
        [...aiOverviewEvents, ...events.filter(e => e.event_type === 'search_without_ai_overview')].forEach(e => {
          const topic = e.query_topic || 'general';
          if (!topicMap[topic]) {
            topicMap[topic] = { count: 0 };
          }
          topicMap[topic].count++;
        });

        // Query category analysis
        const categoryMap = {};
        aiOverviewEvents.forEach(e => {
          const cat = e.query_category || 'general';
          if (!categoryMap[cat]) {
            categoryMap[cat] = { count: 0 };
          }
          categoryMap[cat].count++;
        });

        // Daily stats
        const dailyMap = {};
        events.forEach(e => {
          const date = e.timestamp?.split('T')[0];
          if (date) {
            if (!dailyMap[date]) {
              dailyMap[date] = { date, searches: 0, clicks: 0, overviews: 0 };
            }
            if (e.event_type === 'ai_overview_shown') {
              dailyMap[date].overviews++;
              dailyMap[date].searches++;
            } else if (e.event_type === 'search_without_ai_overview') {
              dailyMap[date].searches++;
            } else if (e.event_type === 'citation_clicked') {
              dailyMap[date].clicks++;
            }
          }
        });

        const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        // Time to click analysis
        const timeToClicks = clickEvents
          .filter(e => e.time_to_click_ms)
          .map(e => e.time_to_click_ms);
        const avgTimeToClick = timeToClicks.length > 0
          ? (timeToClicks.reduce((a, b) => a + b) / timeToClicks.length / 1000).toFixed(1)
          : 0;

        // 🆕 Group events by user (only for admin)
        const eventsByUser = {};
        if (role === 'admin') {
          events.forEach(e => {
            const userId = e.userId || 'unknown';
            if (!eventsByUser[userId]) {
              eventsByUser[userId] = [];
            }
            eventsByUser[userId].push(e);
          });

          // Sort each user's events by timestamp (newest first)
          Object.keys(eventsByUser).forEach(userId => {
            eventsByUser[userId].sort((a, b) => 
              new Date(b.timestamp) - new Date(a.timestamp)
            );
          });
        }

        // 🆕 Group events by topic
        const eventsByTopic = {};
        events.forEach(e => {
          const topic = e.query_topic || 'general';
          if (!eventsByTopic[topic]) {
            eventsByTopic[topic] = [];
          }
          eventsByTopic[topic].push(e);
        });

        // Sort each topic's events by timestamp (newest first)
        Object.keys(eventsByTopic).forEach(topic => {
          eventsByTopic[topic].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
        });

        setStats({
          totalSearches,
          aiOverviewRate: totalSearches > 0
            ? ((aiOverviewEvents.length / totalSearches) * 100).toFixed(1)
            : 0,
          totalCitations: aiOverviewEvents.reduce((sum, e) => sum + (e.citation_count || 0), 0),
          citationsClicked: clickEvents.length,
          domains,
          queryCategories: categoryMap,
          queryTopics: topicMap,
          dailyStats,
          avgTimeToClick,
          totalEvents: events.length,
          recentEvents: events.slice(-50).reverse(), // Show more recent events
          eventsByUser: role === 'admin' ? eventsByUser : {}, // Only for admin
          eventsByTopic,
          languageComparisonRows,
          languageQueryPairs,
          englishQueries,
          indonesianQueries,
          totalComparedQueries: maxLanguageRows,
          totalEnCitations,
          totalInCitations,
          enOutletCounts,
          inOutletCounts,
          userRole: role,
          currentUserId: currentUserId
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { stats, loading, error, userRole };
};
