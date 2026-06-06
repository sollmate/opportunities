-- ============================================================
-- opportunities_poc — lightweight tax-advisor CRM
-- Target: PostgreSQL 17 (Azure Flexible Server)
-- Run this script while connected to the opportunities_poc database.
-- Idempotent-ish: uses IF NOT EXISTS for schemas; objects assume a fresh DB.
-- ============================================================

-- ---------- schemas ----------
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS advisory;

-- ---------- shared updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- ref — reference / lookup data (left empty; populate later)
-- ============================================================
CREATE TABLE ref.country (
  code char(2) PRIMARY KEY,        -- ISO-3166 alpha-2
  name text NOT NULL
);

CREATE TABLE ref.industry (
  industry_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        text UNIQUE,         -- e.g. WZ / NACE code
  name        text NOT NULL
);

-- ============================================================
-- enums
-- ============================================================
CREATE TYPE crm.client_type      AS ENUM ('company','individual');
CREATE TYPE crm.client_status    AS ENUM ('prospect','active','inactive','archived');
CREATE TYPE crm.address_type     AS ENUM ('registered','billing','mailing','other');
CREATE TYPE crm.channel_type     AS ENUM ('email','phone','mobile','fax','other');
CREATE TYPE advisory.note_type   AS ENUM ('general','meeting','call','preference','tax');
CREATE TYPE advisory.task_status AS ENUM ('open','in_progress','done','cancelled');

-- ============================================================
-- crm — client master data
-- ============================================================
CREATE TABLE crm.client (
  client_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_type     crm.client_type   NOT NULL,
  display_name    text NOT NULL,
  legal_name      text,
  status          crm.client_status NOT NULL DEFAULT 'prospect',
  industry_id     int REFERENCES ref.industry(industry_id),
  tax_number      text,                    -- Steuernummer
  vat_id          text,                    -- USt-IdNr
  register_court  text,                    -- Registergericht
  register_number text,                    -- HRB / HRA
  website         text,
  founded_on      date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_client_display_name ON crm.client (lower(display_name));
CREATE INDEX ix_client_status       ON crm.client (status);

CREATE TABLE crm.contact (
  contact_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES crm.client(client_id) ON DELETE CASCADE,
  salutation     text,
  academic_title text,                     -- e.g. Dr., Prof.
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  job_position   text,                     -- role at the client
  is_primary     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_contact_client ON crm.contact (client_id);

CREATE TABLE crm.contact_channel (
  channel_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid NOT NULL REFERENCES crm.contact(contact_id) ON DELETE CASCADE,
  channel_type crm.channel_type NOT NULL,
  value        text NOT NULL,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, channel_type, value)
);
CREATE INDEX ix_channel_contact ON crm.contact_channel (contact_id);

CREATE TABLE crm.address (
  address_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES crm.client(client_id) ON DELETE CASCADE,
  address_type crm.address_type NOT NULL DEFAULT 'registered',
  line1        text,
  line2        text,
  postal_code  text,
  city         text,
  region       text,
  country_code char(2) REFERENCES ref.country(code),
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_address_client ON crm.address (client_id);

-- ============================================================
-- advisory — tax-advisor working data
-- ============================================================
CREATE TABLE advisory.advisor (
  advisor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name  text NOT NULL,
  email      text UNIQUE,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE advisory.note (
  note_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES crm.client(client_id)   ON DELETE CASCADE,
  contact_id uuid          REFERENCES crm.contact(contact_id) ON DELETE SET NULL,
  author_id  uuid          REFERENCES advisory.advisor(advisor_id) ON DELETE SET NULL,
  note_type  advisory.note_type NOT NULL DEFAULT 'general',
  subject    text,
  body       text NOT NULL,
  is_pinned  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_note_client  ON advisory.note (client_id, created_at DESC);
CREATE INDEX ix_note_contact ON advisory.note (contact_id);

CREATE TABLE advisory.meeting (
  meeting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES crm.client(client_id) ON DELETE CASCADE,
  title      text NOT NULL,
  meeting_at timestamptz,
  location   text,
  summary    text,
  follow_up  text,
  author_id  uuid REFERENCES advisory.advisor(advisor_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_meeting_client ON advisory.meeting (client_id, meeting_at DESC);

CREATE TABLE advisory.meeting_attendee (
  meeting_id uuid NOT NULL REFERENCES advisory.meeting(meeting_id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES crm.contact(contact_id)     ON DELETE CASCADE,
  role       text,
  PRIMARY KEY (meeting_id, contact_id)
);

CREATE TABLE advisory.contact_preference (
  preference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES crm.contact(contact_id) ON DELETE CASCADE,
  category      text,                  -- e.g. communication / meeting / language / personal
  pref_key      text NOT NULL,
  pref_value    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, pref_key)
);
CREATE INDEX ix_pref_contact ON advisory.contact_preference (contact_id);

CREATE TABLE advisory.task (
  task_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES crm.client(client_id)   ON DELETE CASCADE,
  contact_id  uuid          REFERENCES crm.contact(contact_id) ON DELETE SET NULL,
  assigned_to uuid          REFERENCES advisory.advisor(advisor_id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  status      advisory.task_status NOT NULL DEFAULT 'open',
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_task_client ON advisory.task (client_id);
CREATE INDEX ix_task_status ON advisory.task (status, due_date);

CREATE TABLE advisory.tag (
  tag_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL UNIQUE,
  color  text
);

CREATE TABLE advisory.client_tag (
  client_id uuid NOT NULL REFERENCES crm.client(client_id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES advisory.tag(tag_id)  ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- ============================================================
-- updated_at triggers (tables that carry updated_at)
-- ============================================================
CREATE TRIGGER trg_client_updated   BEFORE UPDATE ON crm.client              FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contact_updated  BEFORE UPDATE ON crm.contact             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_address_updated  BEFORE UPDATE ON crm.address             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_advisor_updated  BEFORE UPDATE ON advisory.advisor        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_note_updated     BEFORE UPDATE ON advisory.note           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_meeting_updated  BEFORE UPDATE ON advisory.meeting        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pref_updated     BEFORE UPDATE ON advisory.contact_preference FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_task_updated     BEFORE UPDATE ON advisory.task           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
