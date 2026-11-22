# Project memory

## Product intent & audience

- Environmental risk monitoring app focused on Indian water bodies and algal bloom probability
- Displays real-time water quality sensor data with live streaming dashboard
- Likely audience: researchers, environmental agencies, or public health stakeholders

## Brand personality & voice

- Informative and instructional; provides clear setup guidance when configuration is missing
- Production-oriented, no placeholder/blank states — always shows something useful
- Real-time, data-driven feel emphasizing live updates and continuous monitoring

## Visual design & UX direction

- Live Sensor Feed: real-time scrolling dashboard replacing former Google Maps risk map
- Two viewing modes: Stream (compact expandable rows) and Grid (richer cards with mini bar charts)
- 8 water quality parameters tracked: temperature, pH, dissolved oxygen, chlorophyll-a, nitrates, phosphates, turbidity, rainfall
- Filterable by lake; live/paused indicator; national averages summary at top
- New readings highlighted with "New" badge via live data stream
- Auto-refreshing dashboard panels: stats, risk rankings, status distribution
- Live status bar: "Live" toggle with pulsing indicator, last update timestamp, pause/resume control
- Graceful fallback: when config missing, show step-by-step setup guide instead of blank screen
- Production-quality, visually polished aesthetics expected

## Decisions, constraints & rationale

- Risk Map (Google Maps) removed per user request; replaced with Live Sensor Feed — avoids external API key dependency
- `googleMaps.ts` file left in codebase (unused) in case user wants it later
- Dashboard hero button updated to link to Sensor Feed instead of old map
- Supabase used as database backend (pre-provisioned in environment)
- Confirmed Supabase tables: `lakes`, `monitoring_data`, `predictions`, `alerts`
- App wrapped in `LiveDataProvider` in `App.tsx`; `Dashboard` consumes via `useLiveData()` hook
- Edge function generates new sensor readings every 15 seconds for a random subset of lakes
- Realtime subscriptions via Supabase Realtime channels for all four tables; new data appears without refresh
- Framework stack: Vite + React, Tailwind CSS, Lucide React icons, `@/` path alias

## Open questions & assumptions

- Specific color scheme/legend for bloom probability levels not yet defined
- Whether additional features (layers, filters, clustering) are planned
- Whether the edge function is deployed or needs manual invocation in Supabase
- Whether user wants `googleMaps.ts` removed entirely or kept for future use