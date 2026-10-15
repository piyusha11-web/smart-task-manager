# Smart Task Manager (Next.js + Netlify)

Frontend and backend live in one Next.js project (App Router + Route Handlers), so it deploys on Netlify without CORS issues.

## Run locally
npm install && npm run dev  -> http://localhost:3000
Demo login: aarav@demo.com / 123456

## Deploy on Netlify
1. Push this folder to a GitHub repo.
2. Netlify -> Add new site -> Import from Git -> pick the repo.
3. Build command: `npm run build` (leave publish directory empty; Netlify's Next.js runtime handles it) -> Deploy.

## Structure
- lib/store.js          in-memory DB, validation, dependency rules
- app/api/users         create / list users
- app/api/login         mock login
- app/api/tasks         list / create tasks
- app/api/tasks/[id]    update / delete tasks
- app/page.js           whole UI (board, filters, modal)
