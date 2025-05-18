export interface Candidate {
  id: string; // Assuming UUID, adjust if it's a number
  name: string;
  date_of_birth?: string | null;
  email?: string | null;
  linkedin?: string | null;
  phone?: string | null;
  address?: string | null;
  current_position?: string | null;
  current_company?: string | null;
  salary_expectation?: string | null; // Could be number or structured type too
  cv_url?: string | null;
  status?: string | null; // e.g., 'Active', 'Contacted', 'Hired'
  skills?: string[] | null; // Array of strings
  notes?: string | null;
  owner_id?: string | null; // User ID of the owner/recruiter
  created_by_id?: string | null; // User ID of the creator
  updated_by_id?: string | null; // User ID of the last updater
  created_at: string; // Supabase typically provides this
  updated_at?: string | null; // Supabase typically provides this
  // Add any other relevant fields from your 'candidates' table schema
  gender?: string | null;
  nationality?: string | null;
  languages?: string[] | null; // e.g., ["English", "Vietnamese"]
  other_languages?: string[] | null;
  education_level?: string | null;
  certifications?: string[] | null;
  source?: string | null; // How the candidate was found
  tags?: string[] | null;
  // ... other fields that might be relevant from AddCandidatePage.tsx
  // Fields added based on candidate table schema for CandidatesPage display
  phase?: 'New_Lead' | 'Contacted' | 'Screening' | 'Qualified' | 'Submitted_To_Client' | 'Interview_Process' | 'Offer_Stage' | 'Placed' | 'Archived_Not_Suitable' | 'Archived_Not_Interested' | null;
  current_employment_status?: string | null;
}

// We will add other types like Client, Job, etc., here as needed.
export interface Client {
  id: string; // UUID
  name?: string | null; // Made optional as client_name will be primary for display
  client_name: string; // Added as per user request for display
  industry?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  owner_id?: string | null; // User ID of the owner/account manager
  created_by_id?: string | null;
  updated_by_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// Matches the local ClientInfo in AdminJobsPage
export interface ClientOption {
  id: string;
  client_name: string;
}

// Matches the local HrContactInfo in AdminJobsPage
export interface HrContactOption {
  id: string;
  name: string;
  client_id?: string; // if needed
}

// Enum types based on SQL schema and AdminJobsPage usage
export type JobPhase = 'Open' | 'Sourcing' | 'Interviewing' | 'Offer_Extended' | 'Filled' | 'On_Hold' | 'Cancelled';
export type JobRank = 'High_Priority' | 'Medium_Priority' | 'Low_Priority';
// employment_type_enum from SQL for actual job_type if fetched
export type EmploymentType = 'Full_Time_Permanent' | 'Part_Time_Permanent' | 'Contract' | 'Temporary' | 'Internship' | 'Freelance';

// This is the CORRECTED and SINGLE Job interface definition
export interface Job {
  id: string; 
  position_title: string; // Use position_title as per schema and select queries
  phase: JobPhase | string | null; 
  job_rank: JobRank | string | null;  
  min_monthly_salary: number | null;
  max_monthly_salary: number | null;
  min_annual_salary: number | null;
  max_annual_salary: number | null;
  
  // Relational fields - ensure these match how Supabase returns them (object or array)
  // Based on recent findings, these are likely single objects, not arrays, for *-to-one relations.
  clients: ClientOption | null; 
  hr_contacts: HrContactOption | null; 
  owner_details: { id: string; full_name: string | null; } | null; // owner_id is aliased to owner_details
  
  // Direct columns from jobs table (as per selectQuery & schema)
  work_location: string | null;
  mrt_station: string | null;
  industry_category: string | null;
  job_category: string | null; 
  report_to: string | null;
  english_level: string | null; 
  other_languages: string[] | null;
  visa_support: boolean | null;
  working_hours: string | null;
  insurance: string | null;
  bonus: string | null;
  allowance: string | null;
  probation_period: string | null;
  annual_leave: string | null;
  sick_leave: string | null;

  // Foreign keys from the 'jobs' table schema itself
  client_id?: string; // This is the actual FK column in 'jobs' table
  hr_contact_id?: string | null;
  owner_id?: string | null; 
  
  created_by_id?: string | null;
  updated_by_id?: string | null;
  created_at: string;
  updated_at?: string | null;

  // Other optional fields from 'jobs' schema that might be useful
  job_summary?: string | null;
  requirements?: string | null;
  number_of_employees?: number | null;
  company_overview?: string | null;
  internal_memo?: string | null;
  lower_age_limit?: number | null;
  upper_age_limit?: number | null;
  interview_rounds?: number | null;
  phase_date?: string | null; 
  phase_memo?: string | null;
  // job_type from schema is employment_type_enum, if this is the one for jobs table, add it.
  // For now, assume job_type on Job interface corresponds to employment_type from schema if the column exists on jobs table.
  // If 'jobs' table does not have a job_type/employment_type column, this should be removed or clarified.
  job_type?: EmploymentType | string | null; 
}

// Process related types
export type ProcessStatusEnum = 
  'APPLIED' | 'CV_SUBMITTED_TO_CLIENT' | 'INTERVIEW_SCHEDULED_1ST' | 
  'INTERVIEW_COMPLETED_1ST' | 'INTERVIEW_SCHEDULED_2ND' | 'INTERVIEW_COMPLETED_2ND' | 
  'INTERVIEW_SCHEDULED_FINAL' | 'INTERVIEW_COMPLETED_FINAL' | 'TEST_ASSIGNED' | 
  'TEST_COMPLETED' | 'REFERENCE_CHECK_IN_PROGRESS' | 'REFERENCE_CHECK_COMPLETED' | 
  'OFFER_EXTENDED' | 'OFFER_ACCEPTED_BY_CANDIDATE' | 'OFFER_DECLINED_BY_CANDIDATE' | 
  'REJECTED_BY_CLIENT' | 'CANDIDATE_WITHDREW' | 'PLACEMENT_CONFIRMED' | 
  'ONBOARDING' | 'GUARANTEE_PERIOD' | 'PROCESS_ON_HOLD' | 'PROCESS_CANCELLED';

export interface ProcessCandidateInfo {
  id: string;
  name: string | null;
  email?: string | null; 
}

export interface ProcessJobInfo {
  id: string;
  position_title: string | null;
}

export interface ProcessOwnerInfo {
  id: string;
  full_name: string | null;
}

export interface Process {
  id: string;
  process_status: ProcessStatusEnum | string | null; 
  status_update_date: string; 
  process_memo: string | null;
  
  candidates: ProcessCandidateInfo | null;
  jobs: ProcessJobInfo | null;
  clients: ClientOption | null; 
  hr_contacts: HrContactOption | null; 
  owner_details: ProcessOwnerInfo | null;

  candidate_id: string;
  job_id: string;
  client_id?: string | null;
  hr_contact_id?: string | null;
  owner_id?: string | null;

  candidate_phone?: string | null;
  candidate_email?: string | null; 
  employment_type?: EmploymentType | string | null;
  estimated_fee?: number | null;
  expected_closing_date?: string | null; 
  chance_of_placement?: string | null; 
  process_end?: boolean | null;
  process_end_reason?: string | null; 
  follow_up?: string[] | null;
  created_at: string;
  updated_at?: string | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
}

// START: New types for AddClientPage
export type ClientRank = 'A' | 'B' | 'C' | 'D';

export type ClientPhase =
  | 'Prospecting'
  | 'Qualification'
  | 'Needs_Analysis'
  | 'Proposal_Sent'
  | 'Negotiation'
  | 'Closed_Won'
  | 'Closed_Lost'
  | 'On_Hold';

// Basic User type for dropdowns or general use, based on public.users schema
// This should align with what useAuth might provide or what is fetched for user lists.
export interface User {
  id: string; // uuid from auth.users
  full_name?: string | null; // Made optional as per some usage
  email?: string | null; 
  role?: string | null; // user_role_enum as string
  is_active?: boolean | null;
  // created_at and updated_at can be added if needed from public.users
}
// END: New types for AddClientPage 