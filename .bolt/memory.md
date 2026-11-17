# Project memory

## Product intent & audience

- Environmental risk monitoring app focused on Indian water bodies and algal bloom probability
- Displays 94 Indian water bodies with bloom risk data on an interactive map
- Likely audience: researchers, environmental agencies, or public health stakeholders

## Brand personality & voice

- Informative and instructional; provides clear setup guidance when configuration is missing
- Production-oriented, no placeholder/blank states — always shows something useful

## Visual design & UX direction

- Map-centric UI using Google Maps (replaced Leaflet)
- Water bodies rendered as color-coded circles indicating bloom probability levels
- Clickable info windows on each water body showing bloom probability data
- "Pan to Current Location" button positioned at top-center of map via Google Maps controls
- Graceful fallback: when API key absent, show step-by-step setup guide instead of blank screen
- Production-quality, visually polished aesthetics expected

## Decisions, constraints & rationale

- Migrated map provider from Leaflet to Google Maps per user-provided `initMap` geolocation code
- Removed Leaflet dependency; bundle size reduced
- Google Maps API key loaded from env var `VITE_GOOGLE_MAPS_API_KEY`; not pre-provisioned unlike Supabase
- HTML5 geolocation used for current-location feature
- Supabase used as database backend (pre-provisioned in environment)
- Framework stack: Vite + React, Tailwind CSS, Lucide React icons, `@/` path alias

## Open questions & assumptions

- Google Maps API key still needs to be added by user to `.env`
- Source of the 94 water bodies and bloom probability data assumed to be Supabase — unconfirmed
- Specific color scheme/legend for bloom probability levels not yet defined
- Whether additional map features (layers, filters, clustering) are planned