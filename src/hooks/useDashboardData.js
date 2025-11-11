import { useState, useEffect } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const useDashboardData = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch ALL events from ALL users using collection group
        const eventsSnapshot = await getDocs(collectionGroup(db, 'events'));
        const events = eventsSnapshot.docs.map(doc => ({
          ...doc.data(),
          docId: doc.id,
          userId: doc.ref.parent.parent?.id || 'unknown' // Extract user ID from path
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

        // 🆕 Group events by user
        const eventsByUser = {};
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
          eventsByUser, // 🆕 NEW!
          eventsByTopic  // 🆕 NEW!
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { stats, loading, error };
};
