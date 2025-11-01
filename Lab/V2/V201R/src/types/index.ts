// Persian date utilities and types
export interface PersianDate {
  year: number;
  month: number;
  day: number;
}

export interface TimeValue {
  hours: number;
  minutes: number;
}

// User and Authentication
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  created_at: string;
}

// Paper App Types
export interface Paper {
  id: string;
  user: string;
  date: string; // YYYY-MM-DD format (Shamsi)
  sampling_start_time: string; // hh:mm
  sampling_end_time: string; // hh:mm
  ProductionLine?: 2 | 3 | 4;
  roll_number: string; // unique
  responsible_person_name: string;
  shift?: 'day' | 'night';
  paper_type?: 'test_liner' | 'float' | 'white_top_test_liner';
  paper_size?: number;
  NumberOfTears?: number;
  real_grammage?: number;
  humidity?: number;
  ash_percentage?: number;
  cub?: number;
  
  // Physical specs
  profile?: '+1g' | '+2g' | '+3g' | '+4g' | '>5g';
  density_valve?: number;
  diluting_valve?: number;
  
  // Temperature measurements
  cylinder_temperature_before_press?: number;
  cylinder_temperature_after_press?: number;
  
  // Resistance tests
  burst_test?: string;
  tensile_strength_md?: number;
  tensile_strength_cd?: number;
  cct1?: number;
  cct2?: number;
  cct3?: number;
  cct4?: number;
  cct5?: number;
  rct1?: number;
  rct2?: number;
  rct3?: number;
  rct4?: number;
  rct5?: number;
  
  tearing_time?: string; // Changed to text field for more flexibility
  ProductionDowntime?: string;
  CauseOfTearing?: string;
  calender_applied?: boolean;
  machine_speed?: number;
  
  // Material usage - stored as JSON string with structure {"id":{"val":amount,"brand":"brand_name","text":"description"},...}
  material_usage?: string;
  
  created_at: string;
  last_updated: string;
}

// Pulp App Types
export interface Pulp {
  id: string;
  roll_number?: number;
  ProductionLine?: 0 | 2 | 3 | 4;
  lower_sampling_time?: string; // hh:mm
  downpulpcount?: number;
  lower_headbox_freeness?: number;
  lower_ph?: number;
  lower_pulp_temperature?: number;
  lower_water_filter?: number;
  upper_headbox_consistency?: number;
  upper_headbox_freeness?: number;
  upper_ph?: number;
  upper_pulp_temperature?: number;
  upper_water_filter?: number;
  pond8_consistency?: number;
  curtain_consistency?: number;
  thickener_consistency?: number;
  created_at: string;
  last_updated: string;
}

// Material App Types
export interface Material {
  id: string;
  user: string;
  material_name: string;
  description?: string;
  created_at: string;
  last_updated: string;
}

// Log Types
export interface LogEntry {
  id: string;
  username: string;
  modelName: string;
  timestamp: string;
  actionType: 'create' | 'edit';
}

// Form suggestion types
export interface Suggestions {
  responsiblePersonNames: string[];
  starchBrands: string[];
  materialNames: string[];
  materialUsageAmounts: Record<string, number[]>; // materialId -> amounts[]
}

// Chart types for reports
export interface ChartDataPoint {
  x: string; // roll_number (used as x-axis)
  y: number | null; // value - can be null for missing data
  rollNumber: string;
  samplingTime: string;
  date?: string; // date for tooltip
  type: 'paper' | 'pulp';
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color: string;
}

export interface ChartApiResponse {
  success: boolean;
  series: ChartSeries[];
  roll_numbers?: string[]; // sorted roll numbers from API
  total_points?: number;
}

// QC (Quality Control) Types
export interface Customer {
  id: string;
  name_family: string;
  national_code: string;
  phone_number: string;
  address: string;
  postal_code: string;
  created_at: string;
  last_updated: string;
}

export interface Loading {
  id: string;
  grammage: number;
  width: number;
  humidity: number;
  burst: number;
  cub: number;
  md: number;
  cd: number;
  ash?: number;
  custom: boolean;
  created_at: string;
  last_updated: string;
}

export interface QCRecord {
  id: string;
  rollnumbers: string[]; // Array of paper IDs
  customer_id: string;
  loading_id: string;
  user: string;
  custom_items: string[];
  print_count: number;
  status: 'draft' | 'completed' | 'printed';
  create_time: string;
  last_update: string;
  // Nested details
  rollnumbers_detail?: Paper[]; // Array of paper objects
  customer_detail?: Customer;
  loading_detail?: Loading;
  user_name?: string;
  custom_fields_display?: string[];
  roll_numbers_list?: string[]; // Array of roll number strings
  roll_numbers_display?: string; // Formatted display string
  roll_numbers_count?: number; // Count of roll numbers
}

export interface PaperField {
  field_name: string;
  display_name: string;
  field_type: 'float' | 'integer' | 'text' | 'choice' | 'boolean';
}

// Navigation and App State
export type AppSection = 'dashboard' | 'paper' | 'pulp' | 'material' | 'logs' | 'report' | 'technical-report' | 'qc';

export interface AppState {
  currentUser: User | null;
  currentSection: AppSection;
  isLoading: boolean;
}