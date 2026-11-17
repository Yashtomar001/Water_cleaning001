# Project memory

## Product intent & audience

- Environmental risk monitoring app focused on Indian water bodies and algal bloom probability
- Displays water bodies with bloom risk data on an interactive map with live sensor feed
- Likely audience: researchers, environmental agencies, or public health stakeholders

## Brand personality & voice

- Informative and instructional; provides clear setup guidance when configuration is missing
- Production-oriented, no placeholder/blank states — always shows something useful
- Real-time, data-driven feel emphasizing live updates and continuous monitoring

## Visual design & UX direction

- Map-centric UI using Google Maps
- Water bodies rendered as color-coded circles indicating bloom probability levels
- Clickable info windows on each water body showing bloom probability data
- "Pan to Current Location" button positioned at top-center of map via Google Maps controls
- Live status bar: "Live" toggle with pulsing indicator, last update timestamp, pause/resume control
- Auto-refreshing dashboard panels: stats, risk rankings, status distribution
- Graceful fallback: when API key absent, show step-by-step setup guide instead of blank screen
- Production-quality, visually polished aesthetics expected

## Decisions, constraints & rationale

- Migrated map provider from Leaflet to Google Maps per user-provided `initMap` geolocation code
- Google Maps API key loaded from env var `VITE_GOOGLE_MAPS_API_KEY`; not pre-provisioned unlike Supabase
- HTML5 geolocation used for current-location feature
- Supabase used as database backend (pre-provisioned in environment)
- Confirmed Supabase tables: `lakes`, `monitoring_data`, `predictions`, `alerts`
- App wrapped in `LiveDataProvider` in `App.tsx`; `Dashboard` consumes via `useLiveData()` hook
- Edge function generates new sensor readings every 15 seconds for a random subset of lakes
- Realtime subscriptions via Supabase Realtime channels for all four tables; new data appears without refresh
- Framework stack: Vite + React, Tailwind CSS, Lucide React icons, `@/` path alias

## Open questions & assumptions

- Google Maps API key still needs to be added by user to `.env`
- Specific color scheme/legend for bloom probability levels not yet defined
- Whether additional map features (layers, filters, clustering) are planned
- Whether the edge function is deployed or needs manual invocation in Supabase