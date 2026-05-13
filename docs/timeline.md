## 2. Timeline Feature

### What is the Timeline Feature?
The Timeline feature provides a chronological view of all user interactions with AI Overviews, including:
- Searches performed
- AI Overviews shown/not shown
- Citations clicked
- Dwell time on destination pages
- Journey navigation paths

### How It Works
1. **Event Capture**: All user interactions are timestamped and stored
2. **Categorization**: Events are grouped by:
   - Time (chronological order)
   - Query topic (technology, health, business, etc.)
   - User (admin view only)
3. **Visualization**: Events are displayed in an interactive timeline interface

### Key Data Captured
- `timestamp`: ISO 8601 format timestamp for each event
- `event_type`: Type of interaction
  - `ai_overview_shown`
  - `search_without_ai_overview`
  - `citation_clicked`
  - `citation_dwelled`
  - `navigation_journey`
- `query`: Search query text
- `query_topic`: Classified topic (11 categories)
- `session_id`: Links related events within a browsing session

### Testing the Timeline Feature

#### Prerequisites
- Chrome extension installed and active
- User logged in
- Dashboard application running

#### Test Steps

1. **Basic Timeline View**
   ```
   a. Open dashboard
   b. Navigate to Timeline section
   c. Verify events are displayed in reverse chronological order
   d. Check that timestamps are accurate
   ```

2. **Event Type Filtering**
   ```
   a. Generate different event types:
      - Perform searches with AI Overviews
      - Perform searches without AI Overviews
      - Click citations
   b. In dashboard, filter by event type
   c. Verify correct events are shown/hidden
   ```

3. **Topic-Based Filtering**
   ```
   a. Perform searches across different topics:
      - Technology: "how to use python"
      - Health: "symptoms of flu"
      - Business: "marketing strategies"
   b. View timeline grouped by topic
   c. Verify accurate topic classification
   ```

4. **Admin Multi-User View** (Admin role only)
   ```
   a. Log in as admin user
   b. View timeline with multiple users' data
   c. Verify events are properly attributed to users
   d. Test user-based filtering
   ```

5. **Dwell Time Integration**
   ```
   a. Click a citation
   b. Keep tab active for 30+ seconds
   c. Switch to another tab
   d. Check timeline for dwell_time_ms value
   ```

6. **Real-Time Updates**
   ```
   a. Open dashboard in one tab
   b. Perform searches in another tab
   c. Refresh dashboard
   d. Verify new events appear in timeline
   ```

### Viewing Timeline Data

**Dashboard Access:**
1. Navigate to: `http://localhost:3000` (or deployed URL)
2. Log in with Firebase credentials
3. Access "Timeline" or "Recent Events" section

**Data Display:**
- Events shown in reverse chronological order (newest first)
- Each event card shows:
  - Timestamp
  - Event type (icon + label)
  - Query text
  - Topic classification
  - Relevant metadata (citations, dwell time, etc.)

### Limitations & Constraints

**Constraints:**
- Timeline displays up to 50 most recent events by default
- Events older than retention period (90 days default) are auto-deleted
- Real-time updates require page refresh (no WebSocket/polling)

**Known Limitations:**
1. **Retention Period**: Events are automatically deleted after configured retention period (7/15/30/90 days)
2. **Selective Deletion**: Can only delete events from past 30 days (safety limit)
3. **Performance**: Large datasets (>1000 events) may cause slow rendering
4. **Offline Mode**: Events not synced to Firestore while offline will only appear locally
5. **Topic Classification**: 
   - LLM-based classification requires Firebase Cloud Function
   - Falls back to keyword matching (English only) if LLM unavailable
   - May misclassify ambiguous queries

**Browser Compatibility:**
- Dashboard: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Extension: Chrome/Edge 88+ only

**Privacy Constraints:**
- Query text storage can be disabled in settings
- Admin users see all users' data (GDPR consideration)
- No encryption at rest in Firestore

---

## Data Flow Architecture

### Journey Data Flow
```
User Click → content.js (startJourney) 
→ background.js (activeJourneys Map) 
→ webNavigation listeners 
→ finalizeJourney 
→ Firestore sync
```

### Timeline Event Flow
```
User Interaction → content.js (trackEvent) 
→ background.js (storeEvent) 
→ Chrome Storage (local) 
→ Firestore sync 
→ Dashboard (useDashboardData hook)
```

---

## Firestore Data Structure

### Journey Documents
```
users/{userId}/events/{journeyId}
{
  event_type: "navigation_journey",
  journey_id: string,
  query: string,
  started_at: ISO timestamp,
  ended_at: ISO timestamp,
  end_reason: "tab_closed" | "timeout" | "max_depth_reached",
  root_citation: {
    url: string,
    domain: string,
    position: number
  },
  navigation_tree: {
    node_id: string,
    url: string,
    domain: string,
    visited_at: ISO timestamp,
    dwell_time_ms: number,
    children: [recursive tree structure]
  },
  summary: {
    total_pages_visited: number,
    max_depth: number,
    total_journey_time_ms: number,
    unique_domains_count: number
  }
}
```

### Timeline Event Documents
```
users/{userId}/events/{eventId}
{
  event_type: string,
  timestamp: ISO timestamp,
  session_id: string,
  query: string,
  query_topic: string,
  query_category: string,
  // Type-specific fields...
}
```

