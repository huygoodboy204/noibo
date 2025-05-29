export interface Notification {
  id: string;
  user_id_receiver: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  event_id?: string;
  type: 'event_reminder' | 'event_invitation' | 'event_created' | string;
  remind_time?: string;
}

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
  phase?: JobPhase | null;
  job_rank?: JobRank | null;
  min_monthly_salary?: number | null;
  max_monthly_salary?: number | null;
  min_annual_salary?: number | null;
  max_annual_salary?: number | null;
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
  work_location?: string | null;
  mrt_station?: string | null;
  industry_category?: string | null;
  job_category?: string | null;
  report_to?: string | null;
  english_level?: EnglishLevel | null;
  other_languages?: string[] | null;
  visa_support?: boolean | null;
  working_hours?: string | null;
  insurance?: string | null;
  bonus?: string | null;
  allowance?: string | null;
  probation_period?: string | null;
  annual_leave?: string | null;
  sick_leave?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Process {
  id: string;
  candidate_id: string;
  job_id: string;
  client_id?: string | null;
  hr_contact_id?: string | null;
  candidate_phone?: string | null;
  candidate_email?: string | null;
  employment_type?: EmploymentType | null;
  process_status: ProcessStatus;
  status_update_date: string;
  process_memo?: string | null;
  estimated_fee?: number | null;
  expected_closing_date?: string | null;
  owner_id?: string | null;
  chance_of_placement?: ChanceOfPlacement | null;
  process_end?: boolean | null;
  process_end_reason?: ProcessEndReason | null;
  follow_up?: string[] | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
}

export interface Candidate {
  id: string;
  name: string;
  gender?: Gender | null;
  date_of_birth?: string | null;
  email?: string | null;
  photo_url?: string | null;
  visa_status?: VisaStatus | null;
  ic_passport_no?: string | null;
  caution?: boolean | null;
  linkedin?: string | null;
  facebook?: string | null;
  address?: string | null;
  owner_id?: string | null;
  phase?: CandidatePhase | null;
  phase_date?: string | null;
  phase_memo?: string | null;
  cdd_rank?: CandidateRank | null;
  entry_route?: string | null;
  preferred_industry?: string | null;
  preferred_job?: string | null;
  expected_monthly_salary?: number | null;
  expected_annual_salary?: number | null;
  preferred_location?: string | null;
  preferred_mrt?: string | null;
  notice_period?: string | null;
  employment_start_date?: string | null;
  employment_type?: EmploymentType | null;
  experienced_industry?: string | null;
  experienced_job?: string | null;
  professional_summary?: string | null;
  professional_history?: any; // JSONB
  current_employment_status?: string | null;
  current_monthly_salary?: number | null;
  current_salary_allowance?: string | null;
  highest_education?: string | null;
  course_training?: string | null;
  education_details?: string | null;
  english_level?: EnglishLevel | null;
  other_languages?: string[] | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
  cv_link?: string | null;
}

export interface Client {
  id: string;
  client_name: string;
  registration_no?: string | null;
  website_url?: string | null;
  client_category?: string | null;
  client_industry?: string | null;
  location?: string | null;
  address?: string | null;
  client_rank?: ClientRank | null;
  owner_id?: string | null;
  phase?: ClientPhase | null;
  phase_date?: string | null;
  phase_memo?: string | null;
  business_overview?: string | null;
  working_hours?: string | null;
  insurance?: string | null;
  medical_expense?: string | null;
  bonus?: string | null;
  allowance?: string | null;
  sick_leave?: string | null;
  annual_leave?: string | null;
  probation_period?: string | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  page: number;
  error?: string | null;
}

// ================= ENUMS =================
export type UserRole = 'BD' | 'Headhunter' | 'HR' | 'Manager' | 'Admin';
export type ClientPhase = 'Prospecting' | 'Qualification' | 'Needs_Analysis' | 'Proposal_Sent' | 'Negotiation' | 'Closed_Won' | 'Closed_Lost' | 'On_Hold';
export type ClientRank = 'A' | 'B' | 'C' | 'D';
export type JobPhase = 'Open' | 'Sourcing' | 'Interviewing' | 'Offer_Extended' | 'Filled' | 'On_Hold' | 'Cancelled';
export type JobRank = 'High_Priority' | 'Medium_Priority' | 'Low_Priority';
export type EnglishLevel = 'Native' | 'Fluent' | 'Business' | 'Conversational' | 'Basic' | 'None';
export type CandidatePhase = 'New_Lead' | 'Contacted' | 'Screening' | 'Qualified' | 'Submitted_To_Client' | 'Interview_Process' | 'Offer_Stage' | 'Placed' | 'Archived_Not_Suitable' | 'Archived_Not_Interested';
export type CandidateRank = 'Hot' | 'Warm' | 'Cold' | 'A_List' | 'B_List';
export type EmploymentType = 'Full_Time_Permanent' | 'Part_Time_Permanent' | 'Contract' | 'Temporary' | 'Internship' | 'Freelance';
export type ProcessStatus = 'APPLIED' | 'CV_SUBMITTED_TO_CLIENT' | 'INTERVIEW_SCHEDULED_1ST' | 'INTERVIEW_COMPLETED_1ST' | 'INTERVIEW_SCHEDULED_2ND' | 'INTERVIEW_COMPLETED_2ND' | 'INTERVIEW_SCHEDULED_FINAL' | 'INTERVIEW_COMPLETED_FINAL' | 'TEST_ASSIGNED' | 'TEST_COMPLETED' | 'REFERENCE_CHECK_IN_PROGRESS' | 'REFERENCE_CHECK_COMPLETED' | 'OFFER_EXTENDED' | 'OFFER_ACCEPTED_BY_CANDIDATE' | 'OFFER_DECLINED_BY_CANDIDATE' | 'REJECTED_BY_CLIENT' | 'CANDIDATE_WITHDREW' | 'PLACEMENT_CONFIRMED' | 'ONBOARDING' | 'GUARANTEE_PERIOD' | 'PROCESS_ON_HOLD' | 'PROCESS_CANCELLED';
export type ProcessEndReason = 'PLACEMENT_SUCCESSFUL' | 'CANDIDATE_DECLINED_OFFER' | 'CLIENT_REJECTED_CANDIDATE_CV' | 'CLIENT_REJECTED_CANDIDATE_INTERVIEW' | 'CANDIDATE_WITHDREW_APPLICATION' | 'JOB_FILLED_INTERNALLY_BY_CLIENT' | 'JOB_CANCELLED_BY_CLIENT' | 'JOB_ON_HOLD_BY_CLIENT' | 'NO_SUITABLE_CANDIDATES_FOUND' | 'CANDIDATE_FAILED_BACKGROUND_CHECK' | 'SALARY_EXPECTATION_MISMATCH' | 'CONSULTANT_DECISION_TO_DROP' | 'OTHER';
export type ChanceOfPlacement = 'High' | 'Medium' | 'Low' | 'Very_High' | 'Very_Low';
export type PaymentStatus = 'Pending' | 'Paid' | 'Partially_Paid' | 'Overdue' | 'Cancelled' | 'Refunded';
export type GuaranteePeriod = '30_Days' | '60_Days' | '90_Days' | 'None' | 'Other';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer_Not_To_Say';
export type VisaStatus = 'Citizen' | 'Permanent_Resident' | 'Work_Permit_Holder' | 'Dependent_Pass_Holder' | 'Student_Pass_Holder' | 'Requires_Sponsorship' | 'Not_Applicable';

// ================= USERS =================
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ================= CLIENTS =================
export interface Client {
  id: string;
  client_name: string;
  registration_no?: string | null;
  website_url?: string | null;
  client_category?: string | null;
  client_industry?: string | null;
  location?: string | null;
  address?: string | null;
  client_rank?: ClientRank | null;
  owner_id?: string | null;
  phase?: ClientPhase | null;
  phase_date?: string | null;
  phase_memo?: string | null;
  business_overview?: string | null;
  working_hours?: string | null;
  insurance?: string | null;
  medical_expense?: string | null;
  bonus?: string | null;
  allowance?: string | null;
  sick_leave?: string | null;
  annual_leave?: string | null;
  probation_period?: string | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
}

// ================= HR CONTACTS =================
export interface HrContact {
  id: string;
  client_id: string;
  name: string;
  position_title?: string | null;
  zip_code?: string | null;
  address?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  email_1?: string | null;
  email_2?: string | null;
  division?: string | null;
  newsletter?: string[] | null;
  key_person?: boolean | null;
  memo?: string | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
}

// ================= JOBS =================
export interface Job {
  id: string;
  client_id: string;
  hr_contact_id?: string | null;
  owner_id?: string | null;
  phase?: JobPhase | null;
  phase_date?: string | null;
  phase_memo?: string | null;
  job_rank?: JobRank | null;
  position_title: string;
  job_summary?: string | null;
  report_to?: string | null;
  requirements?: string | null;
  number_of_employees?: number | null;
  working_hours?: string | null;
  company_overview?: string | null;
  visa_support?: boolean | null;
  internal_memo?: string | null;
  industry_category?: string | null;
  job_category?: string | null;
  min_monthly_salary?: number | null;
  max_monthly_salary?: number | null;
  min_annual_salary?: number | null;
  max_annual_salary?: number | null;
  lower_age_limit?: number | null;
  upper_age_limit?: number | null;
  work_location?: string | null;
  mrt_station?: string | null;
  english_level?: EnglishLevel | null;
  other_languages?: string[] | null;
  insurance?: string | null;
  bonus?: string | null;
  allowance?: string | null;
  annual_leave?: string | null;
  sick_leave?: string | null;
  probation_period?: string | null;
  interview_rounds?: number | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
}

// ================= CANDIDATES =================
export interface Candidate {
  id: string;
  name: string;
  gender?: Gender | null;
  date_of_birth?: string | null;
  email?: string | null;
  photo_url?: string | null;
  visa_status?: VisaStatus | null;
  ic_passport_no?: string | null;
  caution?: boolean | null;
  linkedin?: string | null;
  facebook?: string | null;
  address?: string | null;
  owner_id?: string | null;
  phase?: CandidatePhase | null;
  phase_date?: string | null;
  phase_memo?: string | null;
  cdd_rank?: CandidateRank | null;
  entry_route?: string | null;
  preferred_industry?: string | null;
  preferred_job?: string | null;
  expected_monthly_salary?: number | null;
  expected_annual_salary?: number | null;
  preferred_location?: string | null;
  preferred_mrt?: string | null;
  notice_period?: string | null;
  employment_start_date?: string | null;
  employment_type?: EmploymentType | null;
  experienced_industry?: string | null;
  experienced_job?: string | null;
  professional_summary?: string | null;
  professional_history?: any; // JSONB
  current_employment_status?: string | null;
  current_monthly_salary?: number | null;
  current_salary_allowance?: string | null;
  highest_education?: string | null;
  course_training?: string | null;
  education_details?: string | null;
  english_level?: EnglishLevel | null;
  other_languages?: string[] | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
  cv_link?: string | null;
}

// ================= PROCESSES =================
export interface Process {
  id: string;
  candidate_id: string;
  job_id: string;
  client_id?: string | null;
  hr_contact_id?: string | null;
  candidate_phone?: string | null;
  candidate_email?: string | null;
  employment_type?: EmploymentType | null;
  process_status: ProcessStatus;
  status_update_date: string;
  process_memo?: string | null;
  estimated_fee?: number | null;
  expected_closing_date?: string | null;
  owner_id?: string | null;
  chance_of_placement?: ChanceOfPlacement | null;
  process_end?: boolean | null;
  process_end_reason?: ProcessEndReason | null;
  follow_up?: string[] | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
}

// ================= SALES =================
export interface Sale {
  id: string;
  process_id?: string | null;
  client_id?: string | null;
  hr_contact_id?: string | null;
  job_id?: string | null;
  candidate_id?: string | null;
  job_owner_id?: string | null;
  candidate_owner_id?: string | null;
  handled_by_id?: string | null;
  entry_route?: string | null;
  visa_type?: string[] | null;
  offered_monthly_salary?: number | null;
  salary_calc_month?: number | null;
  annual_salary?: number | null;
  offered_allowance?: number | null;
  allowance_calc_month?: number | null;
  annual_allowance?: number | null;
  total_invoice_salary?: number | null;
  fee_percent?: number | null;
  fee_amount?: number | null;
  tax?: number | null;
  total_with_tax?: number | null;
  guarantee_period?: GuaranteePeriod | null;
  start_date?: string | null;
  payment_due_date?: string | null;
  guarantee_end_date?: string | null;
  invoice_date?: string | null;
  payment_status?: PaymentStatus | null;
  payment_received_date?: string | null;
  hard_copy?: boolean | null;
  accounting_no?: string | null;
  billing_same_as_client?: boolean | null;
  billing_name?: string | null;
  billing_address?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  billing_attention?: string | null;
  credit_note_reason?: string | null;
  credit_total_fee?: number | null;
  refund_percent?: number | null;
  refund_amount?: number | null;
  credit_tax?: number | null;
  credit_total_amount?: number | null;
  credit_note_date?: string | null;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
} 