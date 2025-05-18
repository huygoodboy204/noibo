export interface ClientInfo {
  id: string;
  client_name: string;
}

export interface HrContactInfo {
  id: string;
  name: string;
}

export interface UserInfo {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

export interface CandidateInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  current_employment_status?: string;
}

export interface ClientOption {
  id: string;
  client_name: string;
}

export interface HrContactOption {
  id: string;
  name: string;
  client_id: string;
}

export interface Job {
  id: string;
  position_title: string;
  phase: string;
  job_rank: string;
  min_monthly_salary?: number;
  max_monthly_salary?: number;
  min_annual_salary?: number;
  max_annual_salary?: number;
  clients?: {
    id: string;
    client_name: string;
  };
  hr_contacts?: {
    id: string;
    name: string;
  };
  owner_details?: {
    id: string;
    full_name: string;
  };
  work_location?: string;
  mrt_station?: string;
  industry_category?: string;
  job_category?: string;
  report_to?: string;
  english_level?: string;
  other_languages?: string[];
  visa_support?: boolean;
  working_hours?: string;
  insurance?: string;
  bonus?: string;
  allowance?: string;
  probation_period?: string;
  annual_leave?: string;
  sick_leave?: string;
}

export interface Process {
  id: string;
  process_status: string;
  status_update_date: string;
  process_memo?: string;
  candidates?: {
    id: string;
    name: string;
    email: string;
  };
  jobs?: {
    id: string;
    position_title: string;
  };
  clients?: {
    id: string;
    client_name: string;
  };
  hr_contacts?: {
    id: string;
    name: string;
  };
  owner_details?: {
    id: string;
    full_name: string;
  };
}

export interface Candidate {
  id: string;
  name: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  phase?: string;
  current_employment_status?: string;
  resume_url?: string;
  cv_link?: string | null;
  owner_details?: UserInfo;
  created_at?: string;
  updated_at?: string;
  gender?: string;
  address?: string;
  other_languages?: string[];
}

export interface Client {
  id: string;
  client_name: string;
  registration_no?: string;
  website_url?: string;
  client_category?: string;
  client_industry?: string;
  location?: string;
  address?: string;
  client_rank?: string;
  owner_id?: string;
  owner?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  phase?: string;
  phase_date?: string;
  phase_memo?: string;
  business_overview?: string;
  working_hours?: string;
  insurance?: string;
  medical_expense?: string;
  bonus?: string;
  allowance?: string;
  sick_leave?: string;
  annual_leave?: string;
  probation_period?: string;
  created_at?: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  position?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  page: number;
  error?: string | null;
}

export type JobPhase = 'Open' | 'Sourcing' | 'Interviewing' | 'Offer_Extended' | 'Filled' | 'On_Hold' | 'Cancelled';
export type JobRank = 'High_Priority' | 'Medium_Priority' | 'Low_Priority';
export type JobType = 'Full_Time_Permanent' | 'Part_Time_Permanent' | 'Contract' | 'Temporary' | 'Internship' | 'Freelance'; 