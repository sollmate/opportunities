-- ============================================================
-- chat — persistent chat threads + messages for the web UI
-- Target: PostgreSQL 17 (Azure Flexible Server)
-- Run this script while connected to the opportunities_poc database,
-- AFTER opportunities_poc.sql (it reuses public.set_updated_at()).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS chat;

-- ---------- threads ----------
-- One row per conversation. `user_id` is the Entra object id (oid) taken from
-- the validated access token, so threads are scoped per signed-in user.
-- `agent_session_id` links the thread to the agent service's in-memory session
-- created at upload time.
CREATE TABLE chat.thread (
  thread_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL,
  agent_session_id text,
  title            text NOT NULL,
  status           text NOT NULL DEFAULT 'idle',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_thread_user ON chat.thread (user_id, updated_at DESC);

-- ---------- messages ----------
CREATE TABLE chat.message (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES chat.thread(thread_id) ON DELETE CASCADE,
  role       text NOT NULL,          -- 'user' | 'assistant' | 'system'
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_message_thread ON chat.message (thread_id, created_at);

-- ---------- updated_at trigger ----------
CREATE TRIGGER trg_thread_updated BEFORE UPDATE ON chat.thread
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
