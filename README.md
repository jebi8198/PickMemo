# PickMemo

PickMemo is a Next.js learning app for creating notebooks, turning source material into flashcards, and reviewing cards with spaced repetition.

## Stack

- Next.js 16 App Router
- React 19
- NextAuth credentials auth
- MongoDB with Mongoose
- CSS Modules
- Node test runner

## Requirements

- Node.js 24 or newer
- MongoDB connection string
- `NEXTAUTH_SECRET`

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local`:

```bash
MONGODB_URI=mongodb://localhost:27017/pick-memo
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
npm start
```

## Core Features

- Register/login with credentials
- Create, edit, and delete notebooks
- Create cards manually or by JSON bulk input
- Copy an external LLM prompt for converting source material into PickMemo JSON
- Select, Shift-select, and bulk delete cards
- Start review sessions by notebook or across all notebooks
- Save feedback and schedule the next review
- Dashboard stats and forgetting-curve visualization
- Toast notifications for major success and failure flows

## Quality Notes

- API write routes use shared validation utilities in `src/lib/validation.ts`.
- Basic in-memory rate limiting is applied to registration and login attempts.
- Current tests cover validation, review scheduling, and session queue utilities.
- The current review algorithm is SM-2-inspired but still uses the existing schema.

## Improvement Tracking

See `Docs/Improvements.md`.
