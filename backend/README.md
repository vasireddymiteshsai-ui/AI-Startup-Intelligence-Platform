# AI Startup Intelligence Platform - Backend

## Environment Setup
Copy `.env.example` to `.env` and fill in your credentials.

## Firebase Setup
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable Firestore (Native mode)
4. Go to Project Settings → Service Accounts → Generate new private key
5. Save the JSON as `serviceAccountKey.json` in `/backend`

## Running Locally
```bash
npm install
npm run dev
```

Server runs on http://localhost:5000
