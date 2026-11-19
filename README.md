# OBCREW Admin & Fleet Operations Portal

Welcome to the **OBCREW Operations & Fleet Command Center**. This web application is the central operations dashboard for the ObCrew platform (Chauffeur dispatch, Roadside Assistance mechanics, corporate fleet agency vendors, and tri-party financial settlements).

It is built with the exact same high-performance UI architecture and design language as the **OBPARK Admin Panel** (`C:\practicals\next_js_projects\obrive\obpark-admin\apps\web`).

---

## 🛠 Tech Stack

- **Framework:** Next.js (App Router) + React 18 / 19
- **Styling:** Tailwind CSS + Radix UI Primitives + Lucide Icons
- **Animation:** Custom CSS Keyframes (Spatial Radar, Telemetry Pulses) + Framer Motion
- **State & Data:** Zustand (`store/auth.store.ts`) + TanStack React Query
- **Typography:** Custom `microgrammaBold` (`/fonts/microgramma-bold.otf`) + `Geist`

---

## 🚀 Quick Start for Developers

### 1. Install Dependencies
```bash
cd C:\practicals\next_js_projects\obrive\obcrew-admin
pnpm install
# (or npm install / yarn install)
```

### 2. Start the Development Server
```bash
pnpm dev
```
* Open [http://localhost:3060](http://localhost:3060) in your browser.
* The application runs on port `3060` by default to avoid conflicts with `obpark-backend` (`3001`), `obpark-maps` (`3002`), and `obpark-admin` (`3051`).

---

## 🌐 Connected Microservices Architecture

| Service | Port | Endpoint URL | Purpose |
| :--- | :---: | :--- | :--- |
| **obpark-backend** | `3001` | `http://localhost:3001` | Core Monolith (Auth, Crew KYC, Vendors, Quotes, Settlements) |
| **obpark-maps** | `3002` | `http://localhost:3002` | Real-time spatial tracking, 5km Redis geo-index, and WebSockets |
| **obcrew-admin** | `3060` | `http://localhost:3060` | This Admin & Operations Web Portal |

The environment variables are already configured in `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_MAPS_URL=http://localhost:3002
```

---

## 📂 Project Architecture

```
obcrew-admin/
├── app/
│   ├── layout.tsx                # Root layout with microgramma & geist fonts
│   ├── globals.css               # Tailwind & custom scrollbars
│   ├── login/
│   │   └── page.tsx              # Split-screen Login with animated Spatial Radar
│   └── (dashboard)/
│       ├── layout.tsx            # Protected dashboard shell (Sidebar + Header)
│       ├── page.tsx              # Operations Hub Overview (KPIs & Pipeline)
│       ├── crew/
│       │   └── page.tsx          # Driver & Mechanic KYC Verification Desk
│       ├── vendors/
│       │   └── page.tsx          # Fleet Agencies & Tri-Party Partners
│       ├── live-map/
│       │   └── page.tsx          # Live GPS Telemetry Surveillance (Redis stream)
│       ├── settlements/
│       │   └── page.tsx          # 85/15 and 70/15/15 Tri-Party Wallet Ledgers
│       └── incidents/
│           └── page.tsx          # Quality, Rating Disputes & Incident Resolution
├── components/
│   └── layout/
│       ├── Sidebar.tsx           # Navigation matching ObPark with LIVE indicator
│       └── Header.tsx            # Search bar & monolith status beacon
├── hooks/
│   └── useAuth.ts                # Auth helper wired to POST /auth/login
├── lib/
│   ├── fonts.ts                  # Microgramma & Geist typography configuration
│   └── utils.ts                  # Currency formatting & Tailwind merge helper
├── public/
│   └── fonts/                    # High-fidelity OTF & WOFF2 font assets
└── store/
    └── auth.store.ts             # Persistent Zustand auth store
```

---

## 🔑 Backend API Endpoints to Wire

| Page | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Login** | `POST` | `/auth/login` | Authenticate with admin email/password or bypass token |
| **Crew KYC** | `GET` | `/admin/crew/pending` | Fetch pending drivers & mechanics with document URLs |
| **Crew KYC** | `PATCH` | `/admin/crew/:id/verify` | Approve or reject crew documents |
| **Vendors** | `GET` | `/admin/vendor/pending` | Review corporate fleet agency applications |
| **Vendors** | `PATCH` | `/admin/vendor/:id/verify` | Approve or reject vendor fleet agency |
| **Live Map** | `WS` | `obpark-maps` (port 3002) | Listen to `crew:location:update` events |
| **Settlements** | `GET` | `/crew/wallet` & `/vendor/wallet` | Fetch wallet balances and payout transaction ledgers |
| **Incidents** | `PATCH` | `/admin/quality/incidents/:id/resolve` | Adjudicate complaints and apply penalty strikes |
