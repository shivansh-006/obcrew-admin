# Spatial Telemetry Frontend Implementation

## Delivery

Implemented the Developer 2 surveillance view at the repository's existing App Router path, `/admin/live-map`. The checked-in app uses `app/admin/live-map/page.tsx`; it does not currently define `/live-map`.

The page now contains a responsive Leaflet/OpenStreetMap view, authenticated crew telemetry, active dispatch counts and details, crew role/status filters, a selection-centered 5 km visual circle, marker fitting, and a selected crew panel. Driver markers use electric cyan circles; mechanic markers use amber squares. Heading rotates the marker symbol where provided. Active dispatch pickup and destination are drawn as a dashed straight line and are explicitly identified as not a road route.

## REST contract

- Backend origin comes from `NEXT_PUBLIC_BACKEND_URL`, with `http://localhost:4000` as the local fallback. The Maps origin and `NEXT_PUBLIC_MAPS_URL` are not used.
- `GET /booking/admin/active-dispatches?page={page}&limit=50` sends `Authorization: Bearer <existing auth store token>`.
- The service reads the paginated `{ data, total, page, limit }` envelope, validates its shape and coordinates, retains nullable customer fields, nullable crew assignment, nullable destination, and nullable destination coordinates.
- React Query uses a 20 second stale time, refetches on focus, refreshes every 60 seconds, retries once, and exposes manual retry and pagination. Unauthorized/forbidden responses receive a user-safe message.
- Dispatch is associated to a marker only when `assignedCrew.id === crewLocation.crewId`.

## Socket.IO contract

- `socket.io-client` connects only with the existing authenticated store token and connects to `${BACKEND_URL}/admin-surveillance` using `auth: { token }`.
- The listener for `crew:location:update` is attached before connect/join, so it receives snapshot and live events. On every successful connection (including reconnect), it emits `join:admin-surveillance` with `{}` and requires `{ status: 'subscribed' }` for connected state.
- Connection errors, disconnects, reconnecting, acknowledgement failure, cleanup, and disconnect on route unmount are handled. A missing token and the repository's development placeholder token do not open a socket. No internal credential/error detail is rendered.
- Payloads are checked for valid crew ID, role, status, finite bounded coordinates, and optional field types before entering state. Out-of-order events are ignored only when both timestamps are present and the incoming timestamp is older. Missing timestamps are not synthesized.

## Zustand and map

`store/useSpatialTelemetryStore.ts` stores markers by `crewId`, immutably upserts a single marker, preserves prior optional heading/timestamp if a later payload omits them, tracks selected crew and connection state, and supports cleanup. The map is dynamically imported with SSR disabled. React Leaflet retains stable marker keys; OpenStreetMap tiles include attribution. Filters operate on validated telemetry already held in the store.

The operational figures are labeled **Visible crew** and **Active jobs**. Visible crew is a count of valid received map locations, not an online/heartbeat metric. Active jobs is the backend paginated total. The radius is a client-side visualization centered on the selected marker and does not filter backend crew. No speed, battery, network health, online/busy claim, estimated route, or travel time is fabricated.

## Authentication and security

The module reuses `useAuthStore` and the existing `NEXT_PUBLIC_BACKEND_URL` configuration. It does not add auth behavior, mock data, or direct Maps service access. `MAPS_INTERNAL_API_KEY` is never accessed by browser code. The existing dashboard shell can create a `mock-dev-admin-token` during development; this module explicitly refuses to use that placeholder and displays an authentication-required state.

## Files

Created:

- `types/spatial-telemetry.ts`
- `services/spatial-telemetry.service.ts`
- `hooks/useAdminSurveillance.ts`
- `store/useSpatialTelemetryStore.ts`
- `components/map/SpatialMap.tsx`
- `components/map/MapControls.tsx`
- `components/map/CrewDetailsDrawer.tsx`
- `SPATIAL_TELEMETRY_FRONTEND_IMPLEMENTATION.md`

Modified:

- `app/admin/live-map/page.tsx`
- `package.json` and `pnpm-lock.yaml` (Socket.IO client, Leaflet, React Leaflet, Leaflet types)

## Verification and limitations

- `pnpm exec tsc --noEmit` — passed.
- `pnpm lint` — passed.
- `pnpm run build` — passed; `/admin/live-map` is included in the production route output.
- The repository had no test script or test framework before this work. No automated REST/socket/UI test suite was added; live backend and browser behavior still needs verification against a running backend, authorized admin token, and browser network access to OpenStreetMap tiles.
- The deployed backend URL must be configured as `NEXT_PUBLIC_BACKEND_URL`. The supplied project README currently mentions port 3001, whereas the Phase 2 contract specifies port 4000; local fallback follows the Phase 2 contract. Set the environment variable to the actual backend origin for this deployment.
- The backend may return multiple dispatch pages; this view pages through them, while the selected-crew lookup uses the currently loaded page (50 results). No bulk pagination or GPS polling is added.

## Manual verification

1. Set `NEXT_PUBLIC_BACKEND_URL` to the Phase 2 backend origin (local default `http://localhost:4000`).
2. Start the authenticated backend and run `pnpm dev`; sign in using a valid admin backend account.
3. Open `http://localhost:3060/admin/live-map`.
4. Confirm the connection badge reaches Connected after successful subscription, marker events populate the map, and filters change visible markers.
5. Select a marker; confirm telemetry updates in its details panel and any booking is shown only for a matching `Users.id` assignment.
6. Toggle the 5 km radius, refresh dispatches, and exercise paging where the backend returns more than 50 records.
7. Disconnect or invalidate the backend session and confirm the reconnection/authentication and REST error states are visible.
