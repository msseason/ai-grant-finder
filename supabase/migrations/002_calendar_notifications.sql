-- =====================================================
-- AI Grant Finder — Calendar Events & Notification Preferences
-- Run after 001_fix_drop_recreate.sql
-- =====================================================

-- =====================================================
-- CALENDAR EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  event_type   TEXT NOT NULL
                 CHECK (event_type IN ('deadline','milestone','meeting','webinar','resubmission','reminder')),
  event_date   DATE NOT NULL,
  grant_id     UUID REFERENCES grants(id) ON DELETE SET NULL,
  grant_title  TEXT,
  agency       TEXT,
  notes        TEXT,
  is_auto      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar events"
  ON calendar_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATION PREFERENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_enabled       BOOLEAN DEFAULT TRUE,
  weekly_digest       BOOLEAN DEFAULT TRUE,
  new_opportunities   BOOLEAN DEFAULT TRUE,
  deadline_reminders  BOOLEAN DEFAULT TRUE,
  deadline_days       INTEGER[] DEFAULT '{30,7}',
  digest_day          INTEGER DEFAULT 1 CHECK (digest_day BETWEEN 0 AND 6),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own notification preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Done! Verify with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- =====================================================
