-- =====================================================
-- AI Grant Finder — RESET & RECREATE (run this if 001_initial_schema.sql errored)
-- Drops existing tables and recreates them cleanly.
-- Safe to run: no real user data yet.
-- Run in: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- Drop in reverse dependency order
DROP TABLE IF EXISTS grantor_analysis CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS saved_grants CASCADE;
DROP TABLE IF EXISTS grants CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  org_name       TEXT,
  org_type       TEXT CHECK (org_type IN ('nonprofit','for-profit','startup','government','individual','university','other')),
  description    TEXT,
  mission        TEXT,
  industries     TEXT[]   DEFAULT '{}',
  location_state TEXT,
  location_city  TEXT,
  annual_budget  NUMERIC,
  employee_count INTEGER,
  website        TEXT,
  ein            TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GRANTS
-- =====================================================
CREATE TABLE grants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source          TEXT NOT NULL DEFAULT 'manual',
  external_id     TEXT UNIQUE,
  title           TEXT NOT NULL,
  provider        TEXT,
  type            TEXT CHECK (type IN ('Federal','State','Foundation','Corporate','Other')),
  categories      TEXT[]  DEFAULT '{}',
  amount_min      NUMERIC,
  amount_max      NUMERIC,
  deadline        DATE,
  is_rolling      BOOLEAN DEFAULT FALSE,
  eligibility     TEXT,
  description     TEXT,
  application_url TEXT,
  cfda_number     TEXT,
  agency          TEXT,
  last_synced_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grants are publicly readable"
  ON grants FOR SELECT USING (true);

CREATE POLICY "Service role can manage grants"
  ON grants FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- SAVED GRANTS
-- =====================================================
CREATE TABLE saved_grants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  grant_id            UUID REFERENCES grants(id) ON DELETE CASCADE NOT NULL,
  ai_match_score      INTEGER CHECK (ai_match_score BETWEEN 0 AND 100),
  ai_match_reasoning  TEXT,
  notes               TEXT,
  status              TEXT DEFAULT 'saved'
                        CHECK (status IN ('saved','interested','applying','applied','awarded','rejected')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, grant_id)
);

ALTER TABLE saved_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved grants"
  ON saved_grants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- APPLICATIONS
-- =====================================================
CREATE TABLE applications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  grant_id         UUID REFERENCES grants(id) ON DELETE SET NULL,
  grant_title      TEXT,
  status           TEXT DEFAULT 'draft'
                     CHECK (status IN ('draft','submitted','under_review','awarded','rejected')),
  amount_requested NUMERIC,
  submitted_at     TIMESTAMPTZ,
  deadline         DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own applications"
  ON applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GRANTOR ANALYSIS (Phase 2)
-- =====================================================
CREATE TABLE grantor_analysis (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name     TEXT NOT NULL UNIQUE,
  provider_ein      TEXT,
  total_awards_3yr  INTEGER,
  avg_award         NUMERIC,
  success_rate      NUMERIC,
  winning_patterns  JSONB,
  red_flags         TEXT[],
  budget_breakdown  JSONB,
  best_apply_months INTEGER[],
  last_analyzed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grantor_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grantor analysis is publicly readable"
  ON grantor_analysis FOR SELECT USING (true);

-- =====================================================
-- SEED GRANTS (25 — diverse sectors, all US, all org types)
-- =====================================================
INSERT INTO grants (source, title, provider, type, categories, amount_min, amount_max, deadline, is_rolling, eligibility, description, application_url)
VALUES
  ('manual', 'USDA Rural Business Development Grant', 'USDA Rural Development', 'Federal',
   ARRAY['Agriculture','Rural Development','Small Business'], 10000, 500000, NULL, true,
   'Small businesses and nonprofits in rural areas with populations under 50,000.',
   'Supports small businesses and nonprofits in rural America. Can be used for training, business plans, feasibility studies, and infrastructure.',
   'https://www.rd.usda.gov/programs-services/business-programs/rural-business-development-grants'),

  ('manual', 'SBA Small Business Innovation Research (SBIR) Phase I', 'Small Business Administration', 'Federal',
   ARRAY['Research & Development','Technology','Small Business'], 50000, 275000, NULL, true,
   'U.S. small businesses with fewer than 500 employees pursuing R&D with commercial potential.',
   'Funds R&D at small businesses with potential for commercialization. Phase I awards up to $275K for feasibility research.',
   'https://www.sbir.gov/'),

  ('manual', 'NEA Grants for Arts Projects', 'National Endowment for the Arts', 'Federal',
   ARRAY['Arts & Culture','Education','Community Development'], 10000, 100000, NULL, false,
   'Nonprofits, units of government, and federally recognized tribes.',
   'Supports arts projects that celebrate American creativity and cultural heritage across all 50 states.',
   'https://www.arts.gov/grants/grants-for-arts-projects'),

  ('manual', 'EPA Environmental Justice Collaborative Problem-Solving', 'EPA', 'Federal',
   ARRAY['Environmental','Community Development','Public Health'], 100000, 1000000, NULL, false,
   'Nonprofits and community-based organizations working in overburdened communities.',
   'Helps communities address environmental and public health challenges using collaborative problem-solving approaches.',
   'https://www.epa.gov/environmentaljustice'),

  ('manual', 'HUD Community Development Block Grant (CDBG)', 'HUD', 'Federal',
   ARRAY['Housing','Community Development','Economic Development'], 0, 5000000, NULL, true,
   'State and local governments; nonprofits through local CDBG recipients.',
   'Flexible funding for community development activities including housing, public facilities, and economic development.',
   'https://www.hud.gov/program_offices/comm_planning/cdbg'),

  ('manual', 'NIH Small Business Technology Transfer (STTR)', 'National Institutes of Health', 'Federal',
   ARRAY['Healthcare','Research & Development','Biotech'], 50000, 300000, NULL, false,
   'Small businesses partnered with nonprofit research institutions.',
   'Funds cooperative R&D between small businesses and research institutions in health-related areas.',
   'https://grants.nih.gov/grants/funding/sttr.htm'),

  ('manual', 'DOE Office of Science Graduate Student Research', 'Department of Energy', 'Federal',
   ARRAY['Research & Development','STEM','Clean Energy'], 3000, 5000, NULL, false,
   'Graduate students at accredited U.S. universities pursuing STEM degrees.',
   'Provides 3-12 months of collaborative research at DOE national laboratories for graduate students.',
   'https://science.osti.gov/wdts/scgsr'),

  ('manual', 'Farmers Market Promotion Program (FMPP)', 'USDA AMS', 'Federal',
   ARRAY['Agriculture','Food Security','Small Business'], 50000, 500000, NULL, false,
   'Agricultural cooperatives, nonprofits, and local governments promoting direct producer-to-consumer markets.',
   'Supports the development and expansion of farmers markets, roadside stands, and other direct producer-to-consumer markets.',
   'https://www.ams.usda.gov/services/grants/fmpp'),

  ('manual', 'Corporation for National and Community Service AmeriCorps', 'AmeriCorps', 'Federal',
   ARRAY['Community Development','Youth Programs','Nonprofit Management'], 5000, 2000000, NULL, false,
   'Nonprofits, institutions of higher education, and government agencies.',
   'Supports organizations engaging Americans in intensive service addressing the nation''s challenges.',
   'https://americorps.gov/partner/how-it-works/grants'),

  ('manual', 'HRSA Rural Health Care Services Outreach', 'HRSA', 'Federal',
   ARRAY['Healthcare','Rural Development','Community Development'], 150000, 300000, NULL, false,
   'Nonprofits and faith-based organizations in rural health professional shortage areas.',
   'Expands access to coordinated primary care and other health services to rural underserved populations.',
   'https://www.hrsa.gov/grants'),

  ('manual', 'ACF Community Services Block Grant (CSBG)', 'HHS Administration for Children and Families', 'Federal',
   ARRAY['Poverty Reduction','Community Development','Social Services'], 0, 10000000, NULL, true,
   'Community Action Agencies and eligible entities serving low-income individuals and families.',
   'Provides resources to alleviate poverty and create economic opportunity for low-income families.',
   'https://www.acf.hhs.gov/ocs/programs/csbg'),

  ('manual', 'First Nations Development Institute Grants', 'First Nations Development Institute', 'Foundation',
   ARRAY['Indigenous Communities','Economic Development','Food Security'], 10000, 100000, NULL, false,
   'Native American tribes, tribal organizations, and Native nonprofits.',
   'Strengthens American Indian economies to support healthy Native communities.',
   'https://www.firstnations.org/grants/'),

  ('manual', 'W.K. Kellogg Foundation Community Engagement', 'W.K. Kellogg Foundation', 'Foundation',
   ARRAY['Youth Programs','Education','Community Development','Racial Equity'], 50000, 1000000, NULL, false,
   'Nonprofits and community organizations focused on children, families, and communities.',
   'Supports programs that improve conditions for vulnerable children and families through community engagement.',
   'https://www.wkkf.org/grants'),

  ('manual', 'MacArthur Foundation Grants', 'MacArthur Foundation', 'Foundation',
   ARRAY['Criminal Justice','Climate Change','Media','Arts & Culture'], 100000, 1000000, NULL, false,
   'Nonprofits, NGOs, and research institutions addressing significant global and domestic issues.',
   'Supports creative people and effective institutions committed to building a more just, verdant, and peaceful world.',
   'https://www.macfound.org/info-grantseekers/grantmaking-guidelines/'),

  ('manual', 'Google.org Impact Challenge', 'Google.org', 'Corporate',
   ARRAY['Technology','Social Impact','Nonprofit'], 500000, 3000000, NULL, false,
   'Nonprofits using technology to drive lasting change in their communities.',
   'Awards funding to nonprofits using technology and innovation to tackle some of humanity''s biggest challenges.',
   'https://impactchallenge.withgoogle.com/'),

  ('manual', 'Walmart Foundation Community Grant', 'Walmart Foundation', 'Corporate',
   ARRAY['Food Security','Workforce Development','Sustainability'], 250, 5000, NULL, false,
   'Nonprofits in communities with a Walmart or Sam''s Club store.',
   'Provides local organizations with funding to support critical needs in their communities.',
   'https://walmart.org/how-we-give/local-giving-programs'),

  ('manual', 'Bank of America Neighborhood Builders', 'Bank of America', 'Corporate',
   ARRAY['Community Development','Housing','Workforce Development'], 200000, 200000, NULL, false,
   'Nonprofits with proven track record of 5+ years in community development.',
   'Awards $200K grants plus leadership training to nonprofits strengthening neighborhoods and economies.',
   'https://about.bankofamerica.com/en/making-an-impact/neighborhood-builders'),

  ('manual', 'OJJDP Title II Formula Grants', 'Office of Juvenile Justice', 'Federal',
   ARRAY['Youth Programs','Criminal Justice','Public Safety'], 0, 5000000, NULL, true,
   'States and territories, distributed to local agencies and nonprofits.',
   'Supports state and local juvenile justice and delinquency prevention programs.',
   'https://ojjdp.gov/programs/antigang/'),

  ('manual', 'IMLS Museums for America', 'Institute of Museum and Library Services', 'Federal',
   ARRAY['Arts & Culture','Education','Community Development'], 5000, 500000, NULL, false,
   'Museums, libraries, and cultural institutions accredited in the US.',
   'Strengthens individual museums as active resources for lifelong learning and community engagement.',
   'https://www.imls.gov/grants/available/museums-america'),

  ('manual', 'SNAP-Ed Nutrition Education Grant', 'USDA FNS', 'Federal',
   ARRAY['Food Security','Public Health','Education'], 50000, 2000000, NULL, false,
   'State agencies, universities, nonprofits delivering nutrition education to SNAP-eligible populations.',
   'Funds evidence-based nutrition education and obesity prevention for low-income Americans.',
   'https://www.fns.usda.gov/snap/snap-ed'),

  ('manual', 'LISC Small Business Grants', 'Local Initiatives Support Corporation', 'Foundation',
   ARRAY['Small Business','Community Development','Economic Development'], 5000, 250000, NULL, true,
   'Small businesses in underserved communities, especially BIPOC and women-owned businesses.',
   'Provides capital and technical assistance to small businesses in low-income communities across the U.S.',
   'https://www.lisc.org/small-business/'),

  ('manual', 'Cisco Foundation Grants', 'Cisco Foundation', 'Corporate',
   ARRAY['Technology','Education','Economic Development'], 50000, 500000, NULL, false,
   'Nonprofits leveraging technology for social impact, education, and economic empowerment.',
   'Advances digital inclusion by funding organizations using technology to expand opportunity.',
   'https://www.cisco.com/c/en/us/about/csr/community/nonprofits.html'),

  ('manual', 'National Geographic Society Grants', 'National Geographic Society', 'Foundation',
   ARRAY['Environmental','Research & Development','Education'], 10000, 50000, NULL, false,
   'Researchers, educators, and storytellers addressing environmental and cultural challenges.',
   'Supports exploration, scientific research, and storytelling that helps people understand and protect the planet.',
   'https://www.nationalgeographic.org/society/grants-and-investments/'),

  ('manual', 'Veterans Benefits Administration Grants', 'VA', 'Federal',
   ARRAY['Veterans Services','Housing','Mental Health'], 0, 1000000, NULL, true,
   'Nonprofits and government agencies serving veterans and their families.',
   'Supports programs providing housing, mental health services, and transition assistance to veterans.',
   'https://www.va.gov/homeless/gpd.asp'),

  ('manual', 'DOL Workforce Innovation and Opportunity Act (WIOA)', 'Department of Labor', 'Federal',
   ARRAY['Workforce Development','Job Training','Economic Development'], 100000, 10000000, NULL, false,
   'State workforce agencies, local workforce development boards, nonprofits, community colleges.',
   'Funds job training and employment services to help workers enter or advance in the workforce.',
   'https://www.dol.gov/agencies/eta/wioa');

-- Verify:
SELECT COUNT(*) AS total_grants FROM grants;
SELECT COUNT(*) AS total_tables FROM information_schema.tables
  WHERE table_schema = 'public';
