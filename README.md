# Calendar Board (Mini Trello + Calendar)

Calendar task board with a custom monthly grid (no calendar libraries), inline task editing, drag-and-drop reordering across days, and worldwide holidays from the Nager.Date API. Built as a React + TypeScript frontend with a Node.js + MongoDB backend.

## Features
- Custom 6x7 monthly calendar grid (no calendar libraries)
- Inline create/edit/delete tasks directly in day cells
- Drag & drop between days and within the same day (order persists)
- Client-side search (title + notes)
- Country picker + holidays (Nager.Date API) with caching
- MongoDB persistence with CRUD API + batch reorder

## Tech Stack
- Frontend: React + TypeScript + styled-components + dnd-kit
- Backend: Node.js + Express + MongoDB (Mongoose)
- Monorepo: pnpm workspaces

## Links
- Live Demo: (add after deploy)
- GitHub: https://github.com/xRWDev/Calendar-Board

## Prerequisites
- Node.js 20+
- pnpm 9+
- MongoDB instance (local or hosted)

## Environment Variables
Create env files from the examples:

`apps/api/.env`
- `MONGODB_URI`
- `PORT` (default 4000)
- `CORS_ORIGIN` (e.g. `http://localhost:5173`)

`apps/web/.env`
- `VITE_API_URL` (e.g. `http://localhost:4000`)

## Local Development
```bash
pnpm install
pnpm dev
```

This runs:
- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Build
```bash
pnpm build
```

## Tests
Backend tests (Vitest + Supertest):
```bash
pnpm test
```

Frontend tests are intentionally skipped; backend has 3 route tests for coverage.

## API Endpoints
- `GET /health`
- `GET /api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/reorder`

## Deployment

### Frontend (Vercel)
1. Import the repo in Vercel.
2. Set root to `apps/web`.
3. Build command:
   ```bash
   pnpm install --frozen-lockfile && pnpm --filter @calendar/shared build && pnpm --filter @calendar/web build
   ```
4. Output directory: `dist`
5. Env vars:
   - `VITE_API_URL=https://<your-api-host>`

### Backend (Render)
1. Create a new Web Service from the repo.
2. Set root to `apps/api`.
3. Build command:
   ```bash
   pnpm install --frozen-lockfile && pnpm --filter @calendar/shared build && pnpm --filter @calendar/api build
   ```
4. Start command:
   ```bash
   pnpm --filter @calendar/api start
   ```
5. Env vars:
   - `MONGODB_URI`
   - `PORT` (Render sets this automatically)
   - `CORS_ORIGIN=https://<your-vercel-app>`

## Notes
- Holidays are fetched from `https://date.nager.at/api/v3` and cached in-memory per `{year, countryCode}`.
- Drag & drop works while filtering; visible tasks reorder without affecting hidden tasks order.
