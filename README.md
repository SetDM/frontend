# SetDM Frontend

Modern React + Vite application for managing the SetDM dashboard. The app is built with TypeScript, Tailwind CSS, shadcn/ui components, and the SWC-powered React plugin for fast local iteration.

## Getting Started

```sh
git clone <repo-url>
cd frontend
npm install
npm run dev
```

The development server runs on <http://localhost:5173> by default. Update `src/lib/config.ts` if your backend API base URL changes between environments.

## Available Scripts

- `npm run dev` – start Vite in development mode with hot reloading
- `npm run build` – produce a production build in `dist/`
- `npm run preview` – preview the production build locally
- `npm run lint` – run ESLint with the project configuration

## Deployment

The app is optimized for static hosting providers such as Netlify or Vercel. When deploying to Netlify, ensure `npm run build` is used as the build command and `dist` is the publish directory. For single-page app routing, include the `_redirects` file in `public/` (already present) so deep links resolve to `index.html`.

## Realtime Data

- The Messages workspace connects to the backend through `socket.io-client` when the “Live updates” toggle is on. Make sure the `BACKEND_URL` in `src/lib/config.ts` points to a server that allows WebSocket upgrades and lists your Netlify domain inside the backend CORS allow list.
- Authentication for the socket reuses the same JWT/cookie the API already issues. No additional keys are required, but browsers must be allowed to send credentials (the client already opts into `withCredentials`).
- If the socket disconnects or you toggle live updates off, the UI falls back to manual refresh so existing workflows keep working.

## Tech Stack

- React + TypeScript
- Vite (SWC)
- Tailwind CSS
- shadcn/ui component primitives

## Contributing

1. Create a new branch for your change.
2. Run `npm run lint` and `npm run build` before opening a PR.
3. Ensure any environment variables or configuration changes are documented so deployments stay reproducible.
