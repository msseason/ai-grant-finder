export interface Profile {
  id:             string
  user_id:        string
  org_name:       string | null
  org_type:       'nonprofit' | 'for-profit' | 'startup' | 'government' | 'individual' | 'university' | 'other' | null
  description:    string | null
  mission:        string | null
  industries:     string[]
  location_state: string | null
  location_city:  string | null
  annual_budget:  number | null
  employee_count: number | null
  website:        string | null
  ein:            string | null
  founded_year:   number | null
  created_at:     string
  updated_at:     string
}

export interface Grant {
  id:              string
  source:          string
  external_id:     string | null
  title:           string
  provider:        string | null
  type:            'Federal' | 'State' | 'Foundation' | 'Corporate' | 'Other' | null
  categories:      string[]
  amount_min:      number | null
  amount_max:      number | null
  deadline:        string | null
  is_rolling:      boolean | null
  eligibility:     string | null
  description:     string | null
  application_url: string | null
  cfda_number:     string | null
  agency:          string | null
  last_synced_at:  string
  created_at:      string
}

export interface SavedGrant {
  id:                 string
  user_id:            string
  grant_id:           string
  ai_match_score:     number | null
  ai_match_reasoning: string | null
  notes:              string | null
  status:             'saved' | 'interested' | 'applying' | 'applied' | 'awarded' | 'rejected'
  created_at:         string
  grant?:             Grant
}

export interface Application {
  id:               string
  user_id:          string
  grant_id:         string | null
  grant_title:      string | null
  status:           'draft' | 'submitted' | 'under_review' | 'awarded' | 'rejected'
  amount_requested: number | null
  submitted_at:     string | null
  deadline:         string | null
  notes:            string | null
  created_at:       string
  updated_at:       string
  grant?:           Grant
}

export interface CalendarEvent {
  id:          string
  user_id:     string
  title:       string
  event_type:  'deadline' | 'milestone' | 'meeting' | 'webinar' | 'resubmission' | 'reminder'
  event_date:  string
  grant_id:    string | null
  grant_title: string | null
  agency:      string | null
  notes:       string | null
  is_auto:     boolean
  created_at:  string
  updated_at:  string
}

export interface GrantorAnalysisResult {
  agency:       string
  totalAwards:  number
  totalAmount:  number
  avgAward:     number
  minAward:     number
  maxAward:     number
  yearsActive:  number[]
  topRecipients: { name: string; amount: number; state: string }[]
  recentAwards: { title: string; recipient: string; amount: number; date: string; state: string }[]
  error?:       string
}

export interface FoundationResult {
  ein:          string
  name:         string
  city:         string
  state:        string
  nteeCode:     string
  revenue:      number | null
  assets:       number | null
  totalGiving:  number | null
  filingYear:   number | null
  website:      string | null
  profileUrl:   string
}

export interface GrantorAnalysis {
  id:                string
  provider_name:     string
  total_awards_3yr:  number | null
  avg_award:         number | null
  success_rate:      number | null
  winning_patterns:  Record<string, unknown> | null
  red_flags:         string[] | null
  budget_breakdown:  Record<string, number> | null
  best_apply_months: number[] | null
  last_analyzed_at:  string
}

export interface MatchResult {
  grant_id:      string
  score:         number
  reasoning:     string
  key_strengths: string[]
  gaps:          string[]
}
