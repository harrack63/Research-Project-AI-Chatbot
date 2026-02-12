export type Chat = {
  id: string;
  label: string;
  chatname: string;
  date: Date;
  images?: ChatImage[];
};

export type ChatImage = {
  id: string;
  url: string;
  title: string;
  description: string;
};

export type ChatCategory = {
  label: string;
  chats: Chat[];
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type ChatResponse = {
  messages: Message[];
  images: ChatImage[];
};

export type PersonaConditionNote = {
  Condition: string;
  Notes: string;
};

export type PersonaState = {
  age?: number | null;
  sex_at_birth?: "male" | "female" | "other" | null;
  race?: string | null;
  culture?: string | null;
  marital_status?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  waist_circumference_cm?: number | null;
  BMI?: number | null;
  total_cholesterol_mg_dl?: number | null;
  triglyceride_mg_dl?: number | null;
  HbA1c_percent?: number | null;
  glucose_plasma_mg_dl?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  LDL_mg_dl?: number | null;
  insulin_status?: boolean | null;
  BUN_mg_dl?: number | null;
  uric_acid_mg_dl?: number | null;
  creatinine_mg_dl?: number | null;
  on_lipid_med?: boolean | null;
  on_diabetic_medication?: "insulin" | "oral" | "none" | null;
  on_bp_medication?: boolean | null;
  medication_usage?: string[] | null;
  chronic_conditions?: string[] | null;
  diabetes_status?: "healthy" | "pre-diabetes" | "diabetes";
  history_of_conditions?: PersonaConditionNote[] | null;
  family_history_of_conditions?: PersonaConditionNote[] | null;
  tobacco_use?: boolean | null;
  tobacco_use_details?: string | null;
  tabacco_pack_years?: number | null;
  alcohol_consumption?: string | null;
  sleep_hours?: number | null;
  diet_score?: number | null;
  dietary_restrictions?: string[] | null;
  physical_activity_level?: "low" | "moderate" | "high" | null;
  income_status?: string | null;
  education?: string | null;
  insurance_type?: "none" | "government" | "medicaid" | "private" | null;
  has_healthcare_access?: boolean | null;
  goals?: string | null;
  other_notes?: string | null;
};