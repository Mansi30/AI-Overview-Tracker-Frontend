## Journey Feature

### What is the Journey Feature?
The Journey feature tracks user navigation paths after clicking on AI Overview citations. It records the complete navigation tree, including:
- Starting point (citation clicked in AI Overview)
- All subsequent page navigations
- Time spent on each page (dwell time)
- Navigation depth and breadth

### How It Works
1. **Journey Initialization**: When a user clicks a citation in an AI Overview, a journey begins
2. **Navigation Tracking**: The extension monitors all subsequent navigations from that page
3. **Tree Building**: Creates a hierarchical tree structure of visited pages
4. **Journey Termination**: Ends when the tab is closed, timeout occurs, or max depth is reached

### Key Data Captured
- `journey_id`: Unique identifier for each journey
- `query`: Original search query that led to the citation
- `root_citation`: The clicked citation (URL, domain, position)
- `navigation_tree`: Hierarchical structure of all visited pages
- `summary`: Aggregated statistics
  - Total pages visited
  - Maximum navigation depth
  - Total journey time
  - Unique domains visited
- `dwell_time_ms`: Time spent on each page in the journey

### Testing the Journey Feature

#### Prerequisites
- Chrome extension must be installed and active
- User must be logged in (Firebase authentication required)
- Extension must have proper permissions

#### Test Steps

1. **Basic Journey Test**
   ```
   a. Perform a Google search
   b. Wait for AI Overview to appear
   c. Click on any citation link
   d. Navigate to 2-3 additional pages from that site
   e. Close the tab
   f. Check dashboard for the journey data
   ```

2. **Multi-Domain Journey Test**
   ```
   a. Click a citation from AI Overview
   b. From the opened page, click a link to a different domain
   c. Continue navigating across different domains
   d. Verify all domains are captured in the journey tree
   ```

3. **Timeout Test**
   ```
   a. Click a citation
   b. Wait for 5+ minutes without any navigation
   c. Verify journey is finalized with end_reason: "timeout"
   ```

4. **Max Depth Test**
   ```
   a. Click a citation
   b. Navigate through 10+ consecutive pages
   c. Verify journey stops at depth limit (10)
   d. Check end_reason: "max_depth_reached"
   ```

### Viewing Journey Data
- Navigate to the dashboard
- Look for "Journey Analysis" section
- View metrics:
  - Total journeys tracked
  - Average journey depth
  - Average pages per journey
- Expand individual journeys to see the navigation tree

### Limitations & Constraints

**Constraints:**
- Maximum navigation depth: 10 levels
- Journey timeout: 5 minutes of inactivity
- Journey transfer timeout: 10 seconds (for new tab navigation)
- Only tracks journeys starting from AI Overview citations

**Known Limitations:**
1. **New Tab Navigation**: If citation opens in a new tab, journey may not track if navigation happens too quickly
2. **Redirect Handling**: Some redirect chains may not be perfectly captured
3. **Service Worker Restart**: Active journeys are lost if the extension service worker restarts
4. **Cross-Origin Restrictions**: Cannot track navigation within iframes or cross-origin frames
5. **Multiple Windows**: Journey tracking is tab-specific; opening links in new windows may not be tracked

**Browser Requirements:**
- Chrome 88+ (for webNavigation API features)
- Manifest V3 support
