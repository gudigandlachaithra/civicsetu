export type Role = 'citizen' | 'official';
export type CitizenType = 'student' | 'farmer' | 'general';

export interface Profile {
  id: string;
  phone: string;
  role: Role;
  citizen_type: CitizenType | null;
  department: string | null;
  is_onboarded: boolean;
  name: string | null;
  age: number | null;
  gender: string | null;
  state: string | null;
  district: string | null;
  preferred_language: string | null;
  education_level: string | null;
  course: string | null;
  year_of_study: string | null;
  institution_type: string | null;
  last_exam_percentage: number | null;
  annual_family_income: number | null;
  land_acres: number | null;
  ownership_type: string | null;
  crop_type: string | null;
  annual_income: number | null;
  category: string | null;
  occupation: string | null;
}

export interface SchemeDocument {
  en: string;
  te: string;
}

export interface SchemeRules {
  max_income?: number | null;
  min_age?: number | null;
  max_age?: number | null;
  allowed_categories?: string[] | null;
  gender?: string | null;
  min_land_acres?: number | null;
  max_land_acres?: number | null;
  allowed_education_levels?: string[] | null;
  min_percentage?: number | null;
}

export interface Scheme {
  id: string;
  title_en: string;
  title_te: string;
  description_en: string;
  description_te: string;
  target_group: 'student' | 'farmer' | 'general';
  documents: SchemeDocument[];
  rules: SchemeRules;
}

export type IssueStatus = 'Submitted' | 'In Progress' | 'Resolved';
export type IssueCategory = 'Roads' | 'Water' | 'Sanitation' | 'Electricity' | 'Health' | 'Other';

export interface Issue {
  id: string;
  tracking_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: IssueCategory;
  district: string | null;
  area: string | null;
  landmark: string | null;
  status: IssueStatus;
  officer_remark: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  severity: number | null;
  created_at: string;
  updated_at: string;
}

export interface OfficialSeed {
  phone: string;
  department: string;
  role: string;
}

export interface IssueReporter {
  id: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  issue_id: string | null;
  message_en: string;
  message_te: string;
  is_read: boolean;
  created_at: string;
}
