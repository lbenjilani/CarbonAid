# CarbonAid 🌍

CarbonAid is a full‑stack web app to measure, visualize, and reduce
household carbon emissions.

## Features

### Frontend (React + MUI + TS)

-   **Quiz**: Multi‑section form (transport, energy, diet, consumption).
    Autosaves, shows progress, submits to backend.
-   **Dashboard**: Gated until quiz submission. Shows UK energy charts
    (line + sunburst) and personalized AI suggestions.
-   **AI Suggestions Panel**: Calls `/api/chat` (OpenRouter) with quiz
    data + system prompt. Results are persisted so users see the latest
    tips without regenerating.
-   **Report Page**: Visualizes quiz submission: donut breakdown, bar
    chart of top drivers, inputs summary, recalc button back to Quiz.
-   **Consistent Design**: Green color palette, sticky sidebar, "Back to
    Dashboard" navigation.

### Backend (Express + TS + MongoDB)

-   **Quiz Routes**:
    -   `POST /api/quiz` -- save new submission (sections + meta).
    -   `GET /api/quiz/latest` -- fetch latest submission for a user.
-   **Chat Routes**:
    -   `POST /api/chat` -- proxy to OpenRouter API (GPT‑4o‑mini by
        default).
-   **UK Gas Routes** (demo): serve emissions categories + timeseries
    data.
-   **Error Handling**: Async wrapper + standardized JSON errors.
-   **Persistence**: AI suggestions saved in DB per user (optional).

## Setup

### Requirements

-   Node.js 18+
-   MongoDB (local or Atlas)

### Server

``` bash
cd server
npm install
cp .env.example .env   # fill in values
npm run dev
```

`.env`:

    MONGO_URI=mongodb://localhost:27017/carbonaid
    PORT=5000
    OPENROUTER_API_KEY=your_key_here
    OPENROUTER_MODEL=openai/gpt-4o-mini
    OPENROUTER_SITE_URL=http://localhost:3000
    OPENROUTER_APP_NAME=CarbonAid

### Client

``` bash
cd client
npm install
cp .env.example .env
npm start
```

`client/.env`:

    REACT_APP_API_BASE=http://localhost:5000
    REACT_APP_DEV_USER_ID=66e000000000000000000001

## Development Notes

-   Wrap all async Express handlers in `wrapAsync` to avoid unhandled
    rejections.
-   Use `void` prefix in React effects/handlers for fire‑and‑forget
    async calls.
-   Quiz autosaves to `localStorage`; submitting clears draft and
    redirects to dashboard.
-   Report page dynamically computes values from latest quiz.

## Commit Message Example

See [`commit-msg.md`](./commit-msg.md) for the detailed breakdown of
this feature integration.

------------------------------------------------------------------------

MIT License © 2025 Herdy Cen
