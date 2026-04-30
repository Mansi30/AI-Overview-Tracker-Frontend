# AI Overview Tracker — Frontend

A React dashboard for visualising Google Search AI Overview tracking data. Connects to Firebase (Firestore + Auth) where a companion query runner extension deposits events.

## What it does

- Displays per-query AI Overview appearance stats (rate, dwell time, domain breakdown)
- Language comparison across tracked queries
- Journey tree showing navigation paths triggered by AI Overviews
- Admin view: browse and delete events across all users
- User view: scoped to the logged-in account's data

## Prerequisites

- Node.js 18+
- A Firebase project with **Firestore** and **Email/Password Authentication** enabled
- The companion [ai-overview-query-runner](../ai-overview-query-runner) extension writing data into Firestore

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd AI-Overview-Tracker-frontend
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

Find these values in the Firebase console under **Project settings → Your apps → SDK setup and configuration**.

### 3. Start the dev server

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000). Log in with a Firebase Auth account.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Run dev server with hot reload |
| `npm run build` | Production build to `build/` |
| `npm test` | Run tests in watch mode |
| `npm run deploy` | Build and deploy to Firebase Hosting |

## Deployment

The app deploys to Firebase Hosting. Make sure the Firebase CLI is installed and you're logged in:

```bash
npm install -g firebase-tools
firebase login
npm run deploy
```

This runs `npm run build` then `firebase deploy --only hosting`.

## Project structure

```
src/
  components/
    Dashboard.jsx              # Main dashboard with all tabs and charts
    DashboardHeader.jsx        # Top nav bar with user/refresh controls
    LoginPage.jsx              # Firebase Auth login form
    StatCard.jsx               # Reusable metric card
    CollapsibleJourneyTree.jsx # Expandable journey path visualisation
  hooks/
    useAuth.js                 # Firebase Auth state listener
    useDashboardData.js        # Firestore data fetching and aggregation
  context/
    AuthContext.js             # Auth context provider
  firebaseConfig.js            # Firebase initialisation (reads from .env)
functions/
  index.js                     # Firebase Cloud Functions (if used)
```

## Firestore data structure

The app reads from a `users/{userId}/events/{eventId}` collection path. Each event document is written by the query runner extension and contains fields like `event_type`, `query`, `timestamp`, `ai_overview_present`, and related metadata.

Admin users (identified by role in Firestore) can read events across all user documents.
