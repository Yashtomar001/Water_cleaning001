/*
# Create educational_videos table

## Overview
Adds a table for curated educational videos about how to revive rivers, lakes,
and ponds near you. Videos are publicly readable (no auth required to view).
Authenticated users can mark videos as watched (saved per user).

## New Tables

### `educational_videos`
- id (uuid, PK)
- title (text) — video title
- description (text) — what the video covers
- youtube_id (text) — YouTube video ID for embedding
- category (text) — 'restoration' | 'pollution' | 'community' | 'technique' | 'policy'
- duration_min (int) — approximate duration in minutes
- thumbnail_url (text) — optional custom thumbnail
- sort_order (int) — display ordering
- created_at (timestamptz)

### `video_progress`
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- video_id (uuid, FK to educational_videos)
- watched (boolean, default false)
- created_at (timestamptz)
- unique constraint on (user_id, video_id)

## Security
- educational_videos: RLS enabled, SELECT open to anon + authenticated (public content).
  INSERT/UPDATE/DELETE to authenticated (admin can manage).
- video_progress: RLS enabled, CRUD to authenticated only, owner-scoped via auth.uid().
*/
CREATE TABLE IF NOT EXISTS educational_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  youtube_id text NOT NULL,
  category text NOT NULL DEFAULT 'restoration',
  duration_min int NOT NULL DEFAULT 10,
  thumbnail_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE educational_videos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON educational_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON educational_videos TO authenticated;

DROP POLICY IF EXISTS "public_read_videos" ON educational_videos;
CREATE POLICY "public_read_videos" ON educational_videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_videos" ON educational_videos;
CREATE POLICY "auth_insert_videos" ON educational_videos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_videos" ON educational_videos;
CREATE POLICY "auth_update_videos" ON educational_videos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_videos" ON educational_videos;
CREATE POLICY "auth_delete_videos" ON educational_videos FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES educational_videos(id) ON DELETE CASCADE,
  watched boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON video_progress TO authenticated;

DROP POLICY IF EXISTS "select_own_progress" ON video_progress;
CREATE POLICY "select_own_progress" ON video_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_progress" ON video_progress;
CREATE POLICY "insert_own_progress" ON video_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON video_progress;
CREATE POLICY "update_own_progress" ON video_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_progress" ON video_progress;
CREATE POLICY "delete_own_progress" ON video_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
