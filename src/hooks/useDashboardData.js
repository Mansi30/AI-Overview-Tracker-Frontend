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

        // Fetch events based on role
        let events = [];
        
        if (role === 'admin') {
          // Admin: Fetch ALL events from ALL users using collection group
          const eventsSnapshot = await getDocs(collectionGroup(db, 'events'));
          events = eventsSnapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id,
            userId: doc.ref.parent.parent?.id || 'unknown' // Extract user ID from path
          }));
        } else {
          // Regular user: Fetch only their own events
          if (currentUserId) {
            const userEventsCollection = collection(db, 'users', currentUserId, 'events');
            const userEventsSnapshot = await getDocs(userEventsCollection);
            events = userEventsSnapshot.docs.map(doc => ({
              ...doc.data(),
              docId: doc.id,
              userId: currentUserId
            }));
          }
        }

        // Calculate statistics
        const aiOverviewEvents = events.filter(e => e.event_type === 'ai_overview_shown');
        const clickEvents = events.filter(e => e.event_type === 'citation_clicked');
        const dwellEvents = events.filter(e => e.event_type === 'citation_dwelled');
        // The UI timeline supports ai_overview_shown / citation_clicked / search_without_ai_overview.
        // Exclude citation_dwelled from those views to avoid confusing/empty details.
        const displayEvents = events.filter(e => e.event_type !== 'citation_dwelled');
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

        // Dwell time analysis (tab focus time on citation destinations)
        const dwellTimeMs = dwellEvents
          .map(e => e.dwell_time_ms)
          .filter(v => typeof v === 'number' && !Number.isNaN(v));
        const avgDwellTimeSec = dwellTimeMs.length > 0
          ? (dwellTimeMs.reduce((a, b) => a + b) / dwellTimeMs.length / 1000).toFixed(1)
          : 0;

        // Aggregate dwell times by query and domain/url so the UI can show per-search per-site dwell
        const dwellMap = {}; // key: `${query}||${domain}||${url}` => {count, totalMs, lastTs}
        dwellEvents.forEach(d => {
          const q = d.query || d.session_id || 'unknown_query';
          const domain = d.citation_domain || (d.citation_url ? new URL(d.citation_url).hostname : 'unknown');
          const url = d.citation_url || 'unknown_url';
          const key = `${q}||${domain}||${url}`;
          const ms = Number(d.dwell_time_ms) || 0;
          const ts = d.timestamp || d.dwell_end_timestamp || new Date().toISOString();
          if (!dwellMap[key]) dwellMap[key] = { query: q, domain, url, count: 0, totalMs: 0, lastTs: ts };
          dwellMap[key].count += 1;
          dwellMap[key].totalMs += ms;
          if (new Date(ts) > new Date(dwellMap[key].lastTs)) dwellMap[key].lastTs = ts;
        });

        // Build a structure: dwellByQuery: { [query]: { domain: { url: {count, avgSec, lastTs}}}}
        const dwellByQuery = {};
        Object.values(dwellMap).forEach(item => {
          const avgSec = item.count > 0 ? (item.totalMs / item.count / 1000) : 0;
          if (!dwellByQuery[item.query]) dwellByQuery[item.query] = {};
          if (!dwellByQuery[item.query][item.domain]) dwellByQuery[item.query][item.domain] = [];
          dwellByQuery[item.query][item.domain].push({ url: item.url, count: item.count, avgDwellSec: Number(avgSec.toFixed(1)), lastTs: item.lastTs });
        });

        // Also attach dwell summary to domain objects for quick rendering
        const domainsWithDwell = domains.map(d => {
          const domainDwell = [];
          // gather all queries that have this domain
          Object.keys(dwellByQuery).forEach(q => {
            const domainGroup = dwellByQuery[q][d.domain];
            if (domainGroup && domainGroup.length) {
              domainGroup.forEach(entry => {
                domainDwell.push({ query: q, url: entry.url, count: entry.count, avgDwellSec: entry.avgDwellSec, lastTs: entry.lastTs });
              });
            }
          });
          return { ...d, dwell: domainDwell };
        });

        // 🆕 Group events by user (only for admin)
        const eventsByUser = {};
        if (role === 'admin') {
          displayEvents.forEach(e => {
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
        displayEvents.forEach(e => {
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
          totalDwellEvents: dwellEvents.length,
          avgDwellTimeSec,
          domains: domainsWithDwell,
          dwellByQuery,
          queryCategories: categoryMap,
          queryTopics: topicMap,
          dailyStats,
          avgTimeToClick,
          totalEvents: events.length,
          recentEvents: displayEvents.slice(-50).reverse(), // Show more recent events (excluding dwell)
          eventsByUser: role === 'admin' ? eventsByUser : {}, // Only for admin
          eventsByTopic,
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
