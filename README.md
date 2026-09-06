# BuildMyIdea

BuildMyIdea is a production-oriented MVP for turning an unstructured electronics startup idea into structured, editable, persistent planning data and a printable startup blueprint.

## Stack

- React 18 + TypeScript + Vite
- React Router
- Tailwind CSS
- Firebase Authentication (email/password)
- Cloud Firestore
- Provider-independent `AIService` abstraction with a safe mock implementation

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Firebase configuration

The app is configured for the existing Firebase project `venturepilot-cf134`. Copy `.env.example` to `.env.local` and keep the listed web configuration values, or replace them with values from that same Firebase project.

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase web configuration identifies a Firebase project and is safe to ship when backed by correct Security Rules. Never add Firebase Admin service-account credentials or private AI keys to Vite environment variables.

In the Firebase console:

1. Enable **Authentication → Sign-in method → Email/Password**.
2. Create the Cloud Firestore database.
3. Deploy the included owner-isolation rules and indexes:

```bash
firebase use venturepilot-cf134
firebase deploy --only firestore:rules,firestore:indexes
```

The rules require the authenticated UID to match the `/users/{userId}` path and preserve `ownerId` across startup updates. All unspecified database access is denied.

## Commands

```bash
npm run dev      # development server
npm run build    # type-check and production build
npm test         # deterministic calculation tests
npm run preview  # preview the production build
```

## Data architecture

The MVP stores each startup as a typed aggregate at:

```text
users/{uid}/startups/{startupId}
```

Product specs, BOM, manufacturing, supply chain, compliance, financial assumptions, team, risks, scaling, roadmap, and copilot history are structured fields on that aggregate. This intentionally gives each module one document read and explicit save operation. The rules also cover future subcollections so high-volume conversations or documents can be split out without changing the ownership model.

Temporary form edits remain in React state and are written only on explicit save, avoiding a write per keystroke.

## AI mode

`src/services/aiService.ts` defines the complete replaceable `AIService` interface. The included `MockAIService` provides useful, deterministic demo behavior and can update structured selling-price assumptions from copilot conversation. It uses no secret key.

For production AI, implement the same interface using a secure server-side endpoint such as a Firebase callable Cloud Function. Do not call a private-key AI API directly from the browser.

## Demo

Choose **Explore demo** on the landing page or dashboard. It creates a private copy of the NovaEdge Technologies dataset in the signed-in user's Firestore workspace. All sample prices, risks, compliance items, and operating assumptions are labeled as demo planning data, not quotes, predictions, or legal advice.

## Verification checklist

- Register, login, logout, and protected-route redirect
- Create, read, update, delete, and refresh a startup
- Confirm a second Firebase user cannot access another UID's path (rules emulator or Rules Playground)
- Edit and persist each module
- Check BOM totals, revenue, COGS, gross profit/margin, break-even, and capacity
- Exercise copilot price update, BOM, team, and highest-risk prompts
- Print the consolidated blueprint

The calculation suite covers the deterministic finance and capacity formulas. Firebase integration tests require a configured Firebase emulator or the target project and are intentionally not run against production during a local unit-test command.
