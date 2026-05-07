import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Search, Link, Clock, Zap,
  RefreshCw, Eye, MousePointerClick, ExternalLink, X, Trash2, User
} from 'lucide-react';
import { StatCard } from './StatCard';
import { useDashboardData } from '../hooks/useDashboardData';
import { db, auth } from '../firebaseConfig';
import { doc, deleteDoc } from 'firebase/firestore';
import CollapsibleJourneyTree from './CollapsibleJourneyTree';

export const Dashboard = () => {
  const { stats, loading, error, userRole } = useDashboardData();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [timelineView, setTimelineView] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [dwellMinSec, setDwellMinSec] = useState(0);
  const [dwellSort, setDwellSort] = useState('avgDesc');
  const [dwellSearch, setDwellSearch] = useState('');
  const [dwellPage, setDwellPage] = useState(1);
  const [dwellPageSize] = useState(10);
  const [expandedLanguageRows, setExpandedLanguageRows] = useState({});
  const [selectedQueryPairIdxs, setSelectedQueryPairIdxs] = useState(new Set());

  const toggleQueryPairSelection = (idx) => {
    setSelectedQueryPairIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleLanguageRow = (key) => {
    setExpandedLanguageRows((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const countCitationsByType = (citations) =>
    citations.reduce((acc, c) => {
      const t = (c.classification || '').toLowerCase().trim();
      if (t === 'local') acc.local++;
      else if (t === 'global') acc.global++;
      return acc;
    }, { local: 0, global: 0 });

  const handleDeleteEvent = async (event, e) => {
    e.stopPropagation(); // Prevent event card click
    
    const confirmMessage = `Are you sure you want to delete this event?\n\n` +
      `Type: ${event.event_type}\n` +
      `Query: "${event.query}"\n` +
      `Date: ${new Date(event.timestamp).toLocaleString()}\n\n` +
      `This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setDeletingEventId(event.docId);
      
      // Delete from Firestore
      const eventDocRef = doc(db, 'users', event.userId, 'events', event.docId);
      await deleteDoc(eventDocRef);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
      setDeletingEventId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
    window.location.reload();
  };

  const cleanAIResponse = (text) => {
    if (!text) return 'No response available';
    
    return text
      .replace(/An AI Overview is not available.*?Try again later\./g, '')
      .replace(/AI OverviewListenPause.*?Try again later\./g, '')
      .replace(/Error translating content.*?Try again later\./g, '')
      .replace(/\d{1,2}s[A-Za-z\s]+YouTube.*?\d{4}/g, '')
      .replace(/Gemini vs\. ChatGPT:.*?Zapier/g, '')
      .replace(/Google Gemini vs ChatGPT:.*?Authority/g, '')
      .replace(/This video discusses.*?capabilities:/g, '')
      .replace(/You can watch this video.*?ecosystem:/g, '')
      .replace(/\s{3,}/g, '\n\n')
      .trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Zap className="mx-auto mb-4 animate-spin text-primary-500" size={48} />
          <p className="text-gray-600 font-medium">Loading research data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const topicColors = {
    technology: '#3b82f6',    // Bright Blue
    business: '#f59e0b',      // Amber/Orange
    politics: '#ef4444',      // Red
    entertainment: '#ec4899', // Pink
    sports: '#10b981',        // Green
    health: '#06b6d4',        // Cyan
    science: '#8b5cf6',       // Purple
    finance: '#059669',       // Emerald Green
    education: '#f97316',     // Orange
    travel: '#a855f7',        // Violet
    general: '#64748b'        // Gray
  };

  const topicIcons = {
    technology: 'Tech',
    business: 'Business',
    politics: 'Politics',
    entertainment: 'Entertainment',
    sports: 'Sports',
    health: 'Health',
    science: 'Science',
    finance: 'Finance',
    education: 'Education',
    travel: 'Travel',
    general: 'General'
  };

  const COLORS = Object.values(topicColors);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex gap-8 items-center">
          <div className="flex gap-4 flex-1">
            {['overview', 'domains', 'topics', 'language', 'timeline', 'journeys'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'language' ? 'Language Comparison' : tab}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Search}
                title="Total Searches"
                value={stats?.totalSearches || 0}
                subtitle="All tracked searches"
                color="blue"
              />
              <StatCard
                icon={Eye}
                title="AI Overview Rate"
                value={`${stats?.aiOverviewRate || 0}%`}
                subtitle="Searches with AI Overview"
                color="green"
              />
              <StatCard
                icon={Link}
                title="Total Citations"
                value={stats?.totalCitations || 0}
                subtitle="Citations extracted"
                color="purple"
              />
              <StatCard
                icon={MousePointerClick}
                title="Citations Clicked"
                value={stats?.citationsClicked || 0}
                subtitle="User interactions"
                color="orange"
              />
              <StatCard
                icon={Clock}
                title="Avg Dwell Time"
                value={`${stats?.avgDwellTimeSec || 0}s`}
                subtitle="Focus time on citation destinations"
                color="purple"
              />
              <StatCard
                icon={MousePointerClick}
                title="Dwell Events"
                value={stats?.totalDwellEvents || 0}
                subtitle="Recorded dwell time measurements"
                color="green"
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900">Avg. Time to Click</h3>
                  <p className="text-sm text-gray-600">Average time users wait before clicking citations</p>
                </div>
              </div>
              <p className="text-4xl font-bold text-primary-600">{stats?.avgTimeToClick}s</p>
              <p className="text-sm text-gray-500 mt-2">Research Insight: Faster engagement indicates higher citation relevance</p>
            </div>

            {stats?.dailyStats && stats.dailyStats.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="searches" stroke="#0ea5e9" name="Searches" strokeWidth={2} />
                    <Line type="monotone" dataKey="overviews" stroke="#10b981" name="AI Overviews" strokeWidth={2} />
                    <Line type="monotone" dataKey="clicks" stroke="#f59e0b" name="Citations Clicked" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* DOMAINS TAB */}
        {activeTab === 'domains' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Link: Top Cited Domains</h3>
                {stats?.domains && stats.domains.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.domains}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="domain" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="citations" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">No domain data available</p>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Domain CTR Analysis</h3>
                {stats?.domains && stats.domains.length > 0 ? (
                  <div className="space-y-3">
                    {stats.domains.slice(0, 8).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{d.domain}</p>
                          <p className="text-xs text-gray-500">{d.citations} citations • {d.clicks} clicks</p>
                        </div>
                        <div className="text-right">
                          <div className="w-16 h-8 bg-gray-200 rounded relative">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded"
                              style={{ width: `${Math.min(d.ctr, 100)}%` }}
                            />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{d.ctr}% CTR</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No CTR data available</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Domain Details</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">Domain</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Citations</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Clicked</th>
                    <th className="text-center p-3 font-semibold text-gray-700">CTR</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Unique URLs</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.domains?.map((d, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{d.domain}</td>
                      <td className="text-center p-3 text-gray-600">{d.citations}</td>
                      <td className="text-center p-3 text-gray-600">{d.clicks}</td>
                      <td className="text-center p-3">
                        <span className={`px-3 py-1 rounded-full font-semibold ${
                          d.ctr > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {d.ctr}%
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <span className="font-bold text-blue-600">{d.urls?.length || 0}</span>
                      </td>
                      <td className="text-center p-3">
                        <button
                          onClick={() => setSelectedDomain(d)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                        >
                          View All URLs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-4">
                <strong>Tip:</strong> Click "View All URLs" to see every citation URL for that domain.
              </p>
            </div>

            {/* Domain dwell details modal-ish panel */}
            {selectedDomain && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Dwell times for {selectedDomain.domain}</h3>
                  <button className="text-sm text-gray-500" onClick={() => setSelectedDomain(null)}>Close</button>
                </div>
                {selectedDomain.dwell && selectedDomain.dwell.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDomain.dwell.map((d, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded flex items-center justify-between">
                        <div>
                          <p className="font-medium">Query: {d.query}</p>
                          <p className="text-xs text-gray-500">URL: {d.url}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{d.avgDwellSec}s</p>
                          <p className="text-xs text-gray-500">{d.count} visits • {new Date(d.lastTs).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No dwell data available for this domain.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TOPICS TAB */}
        {activeTab === 'topics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Topic Distribution</h3>
                {stats?.queryTopics && Object.keys(stats.queryTopics).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(stats.queryTopics).map(([name, data]) => ({
                          name: name.charAt(0).toUpperCase() + name.slice(1),
                          value: data.count,
                          fill: topicColors[name] || '#64748b'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {Object.keys(stats.queryTopics).map((topic, index) => (
                          <Cell key={`cell-${index}`} fill={topicColors[topic] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">No topic data available</p>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Breakdown</h3>
                <div className="space-y-3">
                  {stats?.queryTopics && Object.entries(stats.queryTopics)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([topic, data], idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded"
                      style={{ backgroundColor: `${topicColors[topic]}15` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{topicIcons[topic] || 'General'}</span>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{topic}</p>
                          <p className="text-xs text-gray-500">Search queries</p>
                        </div>
                      </div>
                      <span 
                        className="px-4 py-2 rounded-lg font-bold text-white"
                        style={{ backgroundColor: topicColors[topic] }}
                      >
                        {data.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search: Query Category Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats?.queryCategories && Object.entries(stats.queryCategories).map(([category, data], idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <p className="text-sm text-gray-600 capitalize">{category}</p>
                    <p className="text-2xl font-bold text-blue-800">{data.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LANGUAGE TAB */}
        {activeTab === 'language' && (() => {
          const hasSelection = selectedQueryPairIdxs.size > 0;
          const allPairs = stats?.languageQueryPairs || [];
          const activePairs = hasSelection
            ? allPairs.filter((_, i) => selectedQueryPairIdxs.has(i))
            : allPairs;

          const sumOutlets = (pairs, lang) =>
            pairs.reduce((acc, p) => {
              const c = countCitationsByType(p[lang]?.citations || []);
              acc.local += c.local;
              acc.global += c.global;
              return acc;
            }, { local: 0, global: 0 });

          const displayEnCitations = hasSelection
            ? activePairs.reduce((sum, p) => sum + (p.en?.citationCount || 0), 0)
            : (stats?.totalEnCitations || 0);

          const displayIdCitations = hasSelection
            ? activePairs.reduce((sum, p) => sum + (p.id?.citationCount || 0), 0)
            : (stats?.totalIdCitations || 0);

          const displayEnOutlets = hasSelection
            ? sumOutlets(activePairs, 'en')
            : stats?.enOutletCounts;

          const displayIdOutlets = hasSelection
            ? sumOutlets(activePairs, 'id')
            : stats?.idOutletCounts;

          const displayPairs = allPairs.map((pair, idx) => ({ pair, idx }))
            .filter(({ idx }) => !hasSelection || selectedQueryPairIdxs.has(idx));

          return (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600">Compared Queries</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats?.totalComparedQueries || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600">EN Total Citations</p>
                  <p className="text-3xl font-bold text-blue-700 mt-2">
                    {displayEnCitations}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600">ID Total Citations</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-2">
                    {displayIdCitations}
                  </p>
                </div>
              </div>

              {/* Query pair selector */}
              {allPairs.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Filter by query pair{hasSelection ? ` (${selectedQueryPairIdxs.size} selected)` : ''}:
                    </label>
                    {hasSelection && (
                      <button
                        onClick={() => setSelectedQueryPairIdxs(new Set())}
                        className="text-xs text-gray-500 hover:text-gray-800 underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {allPairs.map((pair, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${
                          selectedQueryPairIdxs.has(idx)
                            ? 'bg-primary-100 border-primary-400 text-primary-800 font-medium'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedQueryPairIdxs.has(idx)}
                          onChange={() => toggleQueryPairSelection(idx)}
                        />
                        {pair.en?.query || '(no EN)'}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Outlet Type Comparison Chart */}
              {(displayEnOutlets || displayIdOutlets) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Local vs Global Outlets by Language</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          language: 'English',
                          Local: displayEnOutlets?.local || 0,
                          Global: displayEnOutlets?.global || 0
                        },
                        {
                          language: 'Indonesian',
                          Local: displayIdOutlets?.local || 0,
                          Global: displayIdOutlets?.global || 0
                        }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="language" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Local" fill="#f59e0b" />
                      <Bar dataKey="Global" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">EN and ID Queries (Expandable Citations)</h3>

                {displayPairs.length > 0 ? (
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-700 w-1/2">English Query</th>
                        <th className="text-left p-3 font-semibold text-gray-700 w-1/2">Indonesian Query</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPairs.map(({ pair, idx }) => (
                        <tr
                          key={`pair-${idx}`}
                          className="border-b align-top"
                        >
                          <td className="p-3">
                            {pair.en ? (
                              <div>
                                <button
                                  onClick={() => toggleLanguageRow(`en-${idx}`)}
                                  className="w-full text-left p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-gray-900 break-words">{pair.en.query}</p>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-200 text-blue-900">
                                        {pair.en.citationCount} citations
                                      </span>
                                      <span className="text-blue-700 font-bold">
                                        {expandedLanguageRows[`en-${idx}`] ? '−' : '+'}
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                {expandedLanguageRows[`en-${idx}`] && (
                                  <div className="mt-2 p-3 rounded-lg border border-blue-100 bg-white">
                                    <p className="text-xs font-semibold text-blue-700 mb-2">Citations</p>
                                    {pair.en.citations.length > 0 ? (
                                      <ul className="space-y-2">
                                        {pair.en.citations.map((citation, citationIdx) => (
                                          <li key={`en-${idx}-${citationIdx}`} className="text-sm text-gray-700">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                {citation.url ? (
                                                  <a
                                                    href={citation.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-700 hover:underline break-words"
                                                  >
                                                    {citation.label}
                                                  </a>
                                                ) : (
                                                  <span className="break-words">{citation.label}</span>
                                                )}
                                                {citation.url && (
                                                  <p className="text-xs text-gray-400 break-all mt-0.5">{citation.url}</p>
                                                )}
                                              </div>
                                              {citation.classification && (
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                  citation.classification.toLowerCase() === 'local'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                  {citation.classification}
                                                </span>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-gray-500">No citation list available</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic p-3">No English query</p>
                            )}
                          </td>
                          <td className="p-3">
                            {pair.id ? (
                              <div>
                                <button
                                  onClick={() => toggleLanguageRow(`id-${idx}`)}
                                  className="w-full text-left p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-gray-900 break-words">{pair.id.query}</p>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                                        {pair.id.citationCount} citations
                                      </span>
                                      <span className="text-emerald-700 font-bold">
                                        {expandedLanguageRows[`id-${idx}`] ? '−' : '+'}
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                {expandedLanguageRows[`id-${idx}`] && (
                                  <div className="mt-2 p-3 rounded-lg border border-emerald-100 bg-white">
                                    <p className="text-xs font-semibold text-emerald-700 mb-2">Citations</p>
                                    {pair.id.citations.length > 0 ? (
                                      <ul className="space-y-2">
                                        {pair.id.citations.map((citation, citationIdx) => (
                                          <li key={`id-${idx}-${citationIdx}`} className="text-sm text-gray-700">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                {citation.url ? (
                                                  <a
                                                    href={citation.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-emerald-700 hover:underline break-words"
                                                  >
                                                    {citation.label}
                                                  </a>
                                                ) : (
                                                  <span className="break-words">{citation.label}</span>
                                                )}
                                                {citation.url && (
                                                  <p className="text-xs text-gray-400 break-all mt-0.5">{citation.url}</p>
                                                )}
                                              </div>
                                              {citation.classification && (
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                  citation.classification.toLowerCase() === 'local'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                  {citation.classification}
                                                </span>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-gray-500">No citation list available</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic p-3">No Indonesian query</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {allPairs.length > 0 ? 'No query pairs selected' : 'No EN/ID citation data available'}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* TIMELINE TAB with 3 Views */}
        {activeTab === 'timeline' && (
          <div className="space-y-8 animate-fade-in">
            {/* View Selector Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setTimelineView('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    timelineView === 'all'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Events
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => setTimelineView('byUser')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      timelineView === 'byUser'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    By User
                  </button>
                )}
                <button
                  onClick={() => setTimelineView('byTopic')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    timelineView === 'byTopic'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Topic
                </button>
                <button
                  onClick={() => setTimelineView('byDwell')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    timelineView === 'byDwell'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Time: Dwell by Query
                </button>
              </div>
            </div>

            {/* ALL EVENTS VIEW */}
            {timelineView === 'all' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">All Events Timeline</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Sorted: Most Recent First
                  </span>
                </div>
                <div className="space-y-4">
                  {stats?.recentEvents && stats.recentEvents.length > 0 ? (
                    stats.recentEvents.map((event, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (event.event_type === 'ai_overview_shown') {
                            setSelectedEvent(event);
                          } else if (event.event_type === 'citation_clicked' && event.citation_url) {
                            window.open(event.citation_url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className={`p-4 border-l-4 bg-gray-50 rounded transition-all ${
                          event.event_type === 'ai_overview_shown' ? 'border-primary-500 cursor-pointer hover:bg-blue-50 hover:shadow-md' : 
                          event.event_type === 'citation_clicked' ? 'border-green-500 cursor-pointer hover:bg-green-50 hover:shadow-md' : 
                          'border-gray-400'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="font-semibold text-gray-900">
                                {event.event_type === 'ai_overview_shown' ? 'AI Overview' :
                                 event.event_type === 'citation_clicked' ? 'Citation Clicked' :
                                 'Search (No Overview)'}
                              </p>
                              {event.query_topic && (
                                <span 
                                  className="px-2 py-1 rounded text-xs font-semibold text-white"
                                  style={{ backgroundColor: topicColors[event.query_topic] }}
                                >
                                  {topicIcons[event.query_topic]} {event.query_topic}
                                </span>
                              )}
                              {event.event_type === 'citation_clicked' && (
                                <ExternalLink size={14} className="text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Query: <span className="font-medium">"{event.query}"</span>
                            </p>
                            {event.event_type === 'citation_clicked' && (
                              <p className="text-sm text-green-600 mt-2">
                                Clicked: <span className="underline font-semibold">
                                  {event.citation_domain}
                                </span> (Position {event.citation_position}) • Click to visit URL
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            <button
                              onClick={(e) => handleDeleteEvent(event, e)}
                              disabled={deletingEventId === event.docId}
                              className={`p-2 rounded-lg transition-all ${
                                deletingEventId === event.docId
                                  ? 'bg-gray-200 cursor-not-allowed'
                                  : 'bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700'
                              }`}
                              title="Delete this event"
                            >
                              {deletingEventId === event.docId ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                        {event.cited_sources && event.cited_sources.length > 0 && (
                          <div className="mt-3 text-sm">
                            <p className="text-gray-700 mb-2">Citations: {event.cited_sources.length}</p>
                            <div className="flex flex-wrap gap-2">
                              {event.cited_sources.slice(0, 3).map((source, sidx) => (
                                <span key={sidx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {source.domain}
                                </span>
                              ))}
                              {event.cited_sources.length > 3 && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                  +{event.cited_sources.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {event.event_type === 'ai_overview_shown' && (
                          <p className="text-xs text-blue-600 mt-2">Click to view full details</p>
                        )}
                        {event.event_type === 'citation_clicked' && (
                          <p className="text-xs text-green-600 mt-2">Link: Click to visit this citation URL →</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No recent events</p>
                  )}
                </div>
              </div>
            )}

            {/* BY USER VIEW */}
            {timelineView === 'byUser' && (
              <div className="space-y-6">
                {stats?.eventsByUser && Object.keys(stats.eventsByUser).length > 0 ? (
                  <>
                    {/* User Selector Dropdown */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[250px]">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select User to View
                          </label>
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
                          >
                            <option value="">-- Select a user --</option>
                            {Object.entries(stats.eventsByUser)
                              .sort((a, b) => b[1].length - a[1].length)
                              .map(([userId, userEvents]) => (
                                <option key={userId} value={userId}>
                                  {userId} ({userEvents.length} events)
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="px-4 py-2 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-600">Total Users</p>
                            <p className="text-2xl font-bold text-blue-800">
                              {Object.keys(stats.eventsByUser).length}
                            </p>
                          </div>
                          <div className="px-4 py-2 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-600">Total Events</p>
                            <p className="text-2xl font-bold text-green-800">
                              {Object.values(stats.eventsByUser).reduce((sum, events) => sum + events.length, 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected User Events */}
                    {selectedUserId && stats.eventsByUser[selectedUserId] ? (
                      <div className="bg-white rounded-lg border-2 border-primary-500 p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                {selectedUserId.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedUserId}</h3>
                                <p className="text-sm text-gray-600">
                                  {stats.eventsByUser[selectedUserId].length} total events
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">First Activity</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(stats.eventsByUser[selectedUserId][stats.eventsByUser[selectedUserId].length - 1]?.timestamp).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 mt-2 mb-1">Latest Activity</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(stats.eventsByUser[selectedUserId][0]?.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* User Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-600">AI Overviews</p>
                            <p className="text-xl font-bold text-blue-800">
                              {stats.eventsByUser[selectedUserId].filter(e => e.event_type === 'ai_overview_shown').length}
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-600">Citations Clicked</p>
                            <p className="text-xl font-bold text-green-800">
                              {stats.eventsByUser[selectedUserId].filter(e => e.event_type === 'citation_clicked').length}
                            </p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-600">Searches</p>
                            <p className="text-xl font-bold text-purple-800">
                              {stats.eventsByUser[selectedUserId].filter(e => e.event_type === 'search_without_ai_overview').length}
                            </p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <p className="text-xs text-gray-600">Top Topic</p>
                            <p className="text-xl font-bold text-orange-800 capitalize">
                              {(() => {
                                const topics = {};
                                stats.eventsByUser[selectedUserId].forEach(e => {
                                  const topic = e.query_topic || 'general';
                                  topics[topic] = (topics[topic] || 0) + 1;
                                });
                                const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
                                return topTopic ? `${topicIcons[topTopic[0]]} ${topTopic[0]}` : 'N/A';
                              })()}
                            </p>
                          </div>
                        </div>

                        {/* Event Timeline */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">📅 Activity Timeline</h4>
                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {stats.eventsByUser[selectedUserId].map((event, idx) => (
                              <div 
                                key={idx}
                                onClick={() => {
                                  if (event.event_type === 'ai_overview_shown') {
                                    setSelectedEvent(event);
                                  } else if (event.event_type === 'citation_clicked' && event.citation_url) {
                                    window.open(event.citation_url, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                className={`p-4 border-l-4 bg-gray-50 rounded transition-all ${
                                  event.event_type === 'ai_overview_shown' ? 'border-primary-500 cursor-pointer hover:bg-blue-50 hover:shadow-md' : 
                                  event.event_type === 'citation_clicked' ? 'border-green-500 cursor-pointer hover:bg-green-50 hover:shadow-md' : 
                                  'border-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="px-2 py-1 bg-white rounded text-xs font-bold text-gray-500">
                                        #{stats.eventsByUser[selectedUserId].length - idx}
                                      </span>
                                      <p className="font-semibold text-gray-900">
                                        {event.event_type === 'ai_overview_shown' ? '🤖 AI Overview' :
                                         event.event_type === 'citation_clicked' ? 'Click Citation Click' :
                                         'Search: Search'}
                                      </p>
                                      {event.query_topic && (
                                        <span 
                                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                                          style={{ backgroundColor: topicColors[event.query_topic] }}
                                        >
                                          {topicIcons[event.query_topic]} {event.query_topic}
                                        </span>
                                      )}
                                      {event.event_type === 'citation_clicked' && (
                                        <ExternalLink size={14} className="text-green-600" />
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 font-medium mt-1">
                                      Query: <span className="text-gray-900">"{event.query}"</span>
                                    </p>
                                    {event.citation_count > 0 && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        📎 {event.citation_count} citations
                                      </p>
                                    )}
                                    {event.event_type === 'citation_clicked' && event.citation_domain && (
                                      <p className="text-xs text-green-600 mt-2">
                                        Link: Clicked: <span className="font-semibold">{event.citation_domain}</span> • Click to visit
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <span className="text-xs text-gray-500 block">
                                      {new Date(event.timestamp).toLocaleDateString()}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 block mt-1">
                                      {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                {event.event_type === 'ai_overview_shown' && (
                                  <p className="text-xs text-blue-600 mt-3">Click to view full AI Overview details</p>
                                )}
                                {event.event_type === 'citation_clicked' && (
                                  <p className="text-xs text-green-600 mt-3">Link: Click to visit this citation URL</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-200 p-12">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="text-gray-400" size={40} />
                          </div>
                          <p className="text-gray-600 text-lg font-medium">Select a user from the dropdown above</p>
                          <p className="text-gray-500 text-sm mt-2">Choose a user to view their complete activity timeline</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-500 text-center py-8">No user data available</p>
                  </div>
                )}
              </div>
            )}

            {/* BY TOPIC VIEW */}
            {timelineView === 'byTopic' && (
              <div className="space-y-6">
                {stats?.eventsByTopic && Object.entries(stats.eventsByTopic).length > 0 ? (
                  Object.entries(stats.eventsByTopic)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([topic, topicEvents]) => (
                    <div 
                      key={topic} 
                      className="bg-white rounded-lg border border-gray-200 p-6"
                      style={{ borderLeftWidth: '4px', borderLeftColor: topicColors[topic] || '#64748b' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{topicIcons[topic] || 'General'}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 capitalize">{topic}</h3>
                            <p className="text-sm text-gray-600">{topicEvents.length} events</p>
                          </div>
                        </div>
                        <div 
                          className="px-4 py-2 rounded-lg text-white font-bold"
                          style={{ backgroundColor: topicColors[topic] || '#64748b' }}
                        >
                          {topicEvents.length}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {topicEvents.slice(0, 10).map((event, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              if (event.event_type === 'ai_overview_shown') {
                                setSelectedEvent(event);
                              } else if (event.event_type === 'citation_clicked' && event.citation_url) {
                                window.open(event.citation_url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className={`p-3 bg-gray-50 rounded text-sm transition-all ${
                              event.event_type === 'ai_overview_shown' ? 'cursor-pointer hover:bg-blue-50 hover:shadow-md' : 
                              event.event_type === 'citation_clicked' ? 'cursor-pointer hover:bg-green-50 hover:shadow-md' : 
                              'hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">
                                    {event.event_type === 'ai_overview_shown' ? '🤖' :
                                     event.event_type === 'citation_clicked' ? 'Click' : 'Search:'}{' '}
                                    "{event.query}"
                                  </p>
                                  {event.event_type === 'citation_clicked' && (
                                    <ExternalLink size={14} className="text-green-600" />
                                  )}
                                </div>
                                {event.citation_count > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {event.citation_count} citations
                                  </p>
                                )}
                                {event.event_type === 'citation_clicked' && event.citation_domain && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Link: <span className="font-semibold">{event.citation_domain}</span> • Click to visit
                                  </p>
                                )}
                                {event.event_type === 'ai_overview_shown' && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Click to view AI Overview details
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 ml-4">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                        {topicEvents.length > 10 && (
                          <p className="text-xs text-gray-500 text-center pt-2">
                            +{topicEvents.length - 10} more events
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-500 text-center py-8">No topic data available</p>
                  </div>
                )}
              </div>
            )}

            {/* BY DWELL VIEW */}
            {timelineView === 'byDwell' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Time: Dwell Time by Query</h3>

                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Min dwell (s)</label>
                    <input
                      type="number"
                      min={0}
                      value={dwellMinSec}
                      onChange={(e) => setDwellMinSec(Number(e.target.value || 0))}
                      className="w-24 px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Sort</label>
                    <select
                      value={dwellSort}
                      onChange={(e) => setDwellSort(e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="avgDesc">Avg Dwell (high→low)</option>
                      <option value="avgAsc">Avg Dwell (low→high)</option>
                      <option value="countDesc">Count (high→low)</option>
                      <option value="recentDesc">Last Seen (new→old)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 ml-auto min-w-[220px]">
                    <input
                      type="search"
                      placeholder="Search query, domain or URL"
                      value={dwellSearch}
                      onChange={(e) => { setDwellSearch(e.target.value); setDwellPage(1); }}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {stats?.dwellByQuery ? (
                    (() => {
                      // Flatten dwellByQuery into rows
                      const rows = [];
                      Object.keys(stats.dwellByQuery).forEach(query => {
                        const domains = stats.dwellByQuery[query];
                        Object.keys(domains).forEach(domain => {
                          domains[domain].forEach(entry => {
                            rows.push({ query, domain, url: entry.url, count: entry.count, avgDwellSec: entry.avgDwellSec, lastTs: entry.lastTs });
                          });
                        });
                      });

                      // Apply min filter + search
                      const filtered = rows
                        .filter(r => r.avgDwellSec >= dwellMinSec)
                        .filter(r => {
                          if (!dwellSearch) return true;
                          const s = dwellSearch.toLowerCase();
                          return (r.query || '').toLowerCase().includes(s)
                            || (r.domain || '').toLowerCase().includes(s)
                            || (r.url || '').toLowerCase().includes(s);
                        });

                      // Apply sorting
                      filtered.sort((a, b) => {
                        if (dwellSort === 'avgDesc') return b.avgDwellSec - a.avgDwellSec;
                        if (dwellSort === 'avgAsc') return a.avgDwellSec - b.avgDwellSec;
                        if (dwellSort === 'countDesc') return b.count - a.count;
                        if (dwellSort === 'recentDesc') return new Date(b.lastTs) - new Date(a.lastTs);
                        return 0;
                      });

                      if (filtered.length === 0) {
                        return <p className="text-gray-500 text-center py-8">No dwell entries match the current filter.</p>;
                      }

                      // Pagination
                      const total = filtered.length;
                      const totalPages = Math.max(1, Math.ceil(total / dwellPageSize));
                      const page = Math.min(Math.max(1, dwellPage), totalPages);
                      const start = (page - 1) * dwellPageSize;
                      const paged = filtered.slice(start, start + dwellPageSize);

                      return (
                        <>
                          <div className="space-y-3">
                            {paged.map((r, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-start justify-between gap-4 hover:bg-gray-100">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{r.query}</p>
                                  <p className="text-xs text-gray-500 truncate mt-1">{r.domain} • <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Open URL</a></p>
                                  <p className="text-xs text-gray-500 mt-1">Last Seen: {new Date(r.lastTs).toLocaleString()}</p>
                                </div>
                                <div className="w-40 text-right flex flex-col items-end gap-1">
                                  <div className="text-sm font-semibold text-gray-900">{r.avgDwellSec}s</div>
                                  <div className="text-xs text-gray-500">{r.count} visits</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pagination controls */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">Showing {start + 1}–{Math.min(start + dwellPageSize, total)} of {total}</div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setDwellPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className={`px-3 py-1 rounded-lg border ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                              >Prev</button>
                              <div className="px-3 py-1 text-sm text-gray-700">{page} / {totalPages}</div>
                              <button
                                onClick={() => setDwellPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className={`px-3 py-1 rounded-lg border ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                              >Next</button>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-gray-500 text-center py-8">No dwell data available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* JOURNEYS TAB */}
        {activeTab === 'journeys' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={Search}
                title="Total Journeys"
                value={stats?.totalJourneys || 0}
                subtitle="Navigation paths tracked"
                color="blue"
              />
              <StatCard
                icon={Link}
                title="Avg Journey Depth"
                value={stats?.avgJourneyDepth || 0}
                subtitle="Average navigation levels"
                color="purple"
              />
              <StatCard
                icon={MousePointerClick}
                title="Avg Pages per Journey"
                value={stats?.avgJourneyPages || 0}
                subtitle="Pages visited per journey"
                color="green"
              />
            </div>

            {/* JOURNEY ANALYTICS CHARTS */}
            {stats?.journeys && stats.journeys.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Journey Depth Distribution */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Journey Depth Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(() => {
                      const depthCounts = {};
                      stats.journeys.forEach(j => {
                        const depth = j.summary?.max_depth || 0;
                        depthCounts[depth] = (depthCounts[depth] || 0) + 1;
                      });
                      return Object.entries(depthCounts)
                        .map(([depth, count]) => ({ depth: `${depth} level${depth > 1 ? 's' : ''}`, count }))
                        .sort((a, b) => parseInt(a.depth) - parseInt(b.depth));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="depth" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-500 mt-3">
                    Shows how many navigation levels users explored in their journeys
                  </p>
                </div>

                {/* Top Citation Domains by Exploration */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Link: Top Citation Domains</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(() => {
                      const domainCounts = {};
                      stats.journeys.forEach(j => {
                        const domain = j.root_citation?.domain || 'unknown';
                        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                      });
                      return Object.entries(domainCounts)
                        .map(([domain, count]) => ({ domain, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 8);
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="domain" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-500 mt-3">
                    Which citation domains lead to the most user exploration
                  </p>
                </div>

                {/* Journey Duration Distribution */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Time: Journey Duration</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(() => {
                      const buckets = {
                        '0-30s': 0,
                        '30s-1m': 0,
                        '1-2m': 0,
                        '2-5m': 0,
                        '5m+': 0
                      };
                      stats.journeys.forEach(j => {
                        const seconds = (j.summary?.total_journey_time_ms || 0) / 1000;
                        if (seconds < 30) buckets['0-30s']++;
                        else if (seconds < 60) buckets['30s-1m']++;
                        else if (seconds < 120) buckets['1-2m']++;
                        else if (seconds < 300) buckets['2-5m']++;
                        else buckets['5m+']++;
                      });
                      return Object.entries(buckets).map(([range, count]) => ({ range, count }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-500 mt-3">
                    How long users spend on their navigation journeys
                  </p>
                </div>

                {/* Pages per Journey Distribution */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pages per Journey</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(() => {
                      const pageCounts = {};
                      stats.journeys.forEach(j => {
                        const pages = j.summary?.total_pages_visited || 0;
                        const bucket = pages > 5 ? '6+' : `${pages}`;
                        pageCounts[bucket] = (pageCounts[bucket] || 0) + 1;
                      });
                      return Object.entries(pageCounts)
                        .map(([pages, count]) => ({ pages: `${pages} page${pages !== '1' ? 's' : ''}`, count }))
                        .sort((a, b) => {
                          const aNum = a.pages === '6+ pages' ? 6 : parseInt(a.pages);
                          const bNum = b.pages === '6+ pages' ? 6 : parseInt(b.pages);
                          return aNum - bNum;
                        });
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="pages" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-500 mt-3">
                    Distribution of how many pages users visit per journey
                  </p>
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-gray-900">Journey: User Journeys</h2>

            {stats?.journeys && stats.journeys.length > 0 ? (
              <div className="space-y-6">
                {stats.journeys
                  .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
                  .slice(0, 10)
                  .map((journey, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          "{journey.query}"
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Started: {new Date(journey.started_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                          {journey.end_reason || 'completed'}
                        </span>
                      </div>
                    </div>

                    {/* Journey Tree */}
                    <CollapsibleJourneyTree journeyData={journey} />
                  </div>
                ))}

                {stats.journeys.length > 10 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">
                      Showing 10 most recent journeys out of {stats.journeys.length} total
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">Journey:</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Journey Data Yet</h3>
                <p className="text-gray-600">
                  Journeys will appear here when users click citations and navigate through multiple pages.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try clicking a citation from AI Overview and browsing through the site!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>AI Overview Tracker • Research Analytics Platform</p>
          <p className="mt-2">Data last synced: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* DOMAIN DETAIL MODAL */}
      {selectedDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Domain: {selectedDomain.domain}</h2>
                <p className="text-gray-600 mt-1">
                  {selectedDomain.citations} citations • {selectedDomain.clicks} clicks • {selectedDomain.ctr}% CTR
                </p>
              </div>
              <button 
                onClick={() => setSelectedDomain(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Link: All Citation URLs ({selectedDomain.urls?.length || 0})
              </h3>
              <div className="space-y-2">
                {selectedDomain.urls && selectedDomain.urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate font-medium">
                        URL #{idx + 1}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{url}</p>
                    </div>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold flex items-center gap-2 flex-shrink-0"
                    >
                      <ExternalLink size={14} />
                      Open
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">Query Details</h2>
                <p className="text-gray-600 mt-1">"{selectedEvent.query}"</p>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div 
                  className="p-4 rounded-lg text-white"
                  style={{ backgroundColor: topicColors[selectedEvent.query_topic] || '#64748b' }}
                >
                  <p className="text-sm opacity-90">Topic</p>
                  <p className="text-lg font-bold capitalize">
                    {topicIcons[selectedEvent.query_topic]} {selectedEvent.query_topic}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Citations</p>
                  <p className="text-lg font-bold text-green-800">{selectedEvent.citation_count}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="text-lg font-bold text-purple-800 capitalize">{selectedEvent.query_category}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-lg font-bold text-orange-800">
                    {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📎 Citations ({selectedEvent.cited_sources?.length || 0})</h3>
                <div className="space-y-2">
                  {selectedEvent.cited_sources && selectedEvent.cited_sources.map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-500 flex-shrink-0">#{source.position}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{source.domain}</p>
                          <p className="text-xs text-gray-500 truncate">{source.text || 'No title'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {source.clicked && (
                          <span className="text-green-600 text-sm font-semibold whitespace-nowrap">Clicked Clicked</span>
                        )}
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 flex-shrink-0"
                          title="Open URL"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Overview Response</h3>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg max-h-96 overflow-y-auto">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {cleanAIResponse(selectedEvent.ai_response_text)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Response text has been cleaned for readability
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
