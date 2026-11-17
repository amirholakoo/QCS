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
  allowed_pages?: AppSection[] | null;
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
  PaperType?: string; // ForeignKey to PaperType model
  PaperType_name?: string; // Display name from PaperType model
  paper_size?: number;
  warehouse?: string;
  NumberOfTears?: number;
  real_grammage?: number;
  humidity?: number;
  ash_percentage?: number;
  cub?: number;
  
  // Physical specs
  profile?: '+1g' | '+2g' | '+3g' | '+4g' | '>5g';
  profile_details?: string; // JSON string with structure {"1": value, "2": value, ..., "24": value}
  density_valve?: number;
  diluting_valve?: number;
  density_valve2?: number;
  diluting_valve2?: number;
  density_valve3?: number;
  diluting_valve3?: number;
  density_valve4?: number;
  diluting_valve4?: number;
  density_valve5?: number;
  diluting_valve5?: number;
  
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
  
  // PM Settings
  pm_settings?: PM_Setting[];
  
  created_at: string;
  last_updated: string;
}

export interface PLCKey {
  id: number;
  name: string;
  fa_name: string;
  key: string;
  value_type: string;
  order_index: number;
  description: string;
}

export interface RollPLCData {
  roll_number: string;
  plc_setting: Record<string, any>;
  creation_datetime?: number;
  paper_breaks?: number;
  printed_length?: number;
}

export interface ProductionMachine {
  id: string;
  title: string;
  created_at: string;
  last_updated: string;
}

export interface PM_Setting {
  id: string;
  paper: string;
  production_machine: string;
  production_machine_title?: string;
  bottom: string;
  top: string;
  fructose_temperature_before_press?: number;
  paper_temperature_before_dryer3?: number;
  dryer3_first_cylinder_temperature?: number;
  cylinder_temperature_before_press?: number;
  cylinder_temperature_after_press?: number;
  paper_temperature_before_starch?: number;
  paper_temperature_before_pop_reel?: number;
  details?: Record<string, string> | null;
  created_at: string;
  last_updated: string;
}

// Pulp App Types
export interface PulpSamplingLocation {
  id: string;
  title: string;
  value: string;
}

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
  sampling_locations?: PulpSamplingLocation[];
  created_at: string;
  last_updated: string;
}

// Material App Types
export interface Material {
  id: string;
  user: string;
  material_name: string;
  en_name?: string;
  description?: string;
  created_at: string;
  last_updated: string;
}

// Paper Type App Types
export interface PaperTypeItem {
  id: string;
  name: string;
  created_at: string;
  last_updated: string;
}

// Log Types
export interface LogDetail {
  name: string;
  old?: string | null;
  new?: string | null;
  roll_number?: string | number | null;
}

export interface LogEntry {
  id: string;
  username: string;
  modelName: string;
  timestamp: string;
  details?: LogDetail[];
  actionType: 'create' | 'edit' | 'delete';
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
  customer_name?: string; // From list serializer
  custom_fields_display?: string[];
  roll_numbers_list?: string[]; // Array of roll number strings
  roll_numbers_display?: string; // Formatted display string
  roll_numbers_count?: number; // Count of roll numbers
  editing_by?: string | null;
  editing_started_at?: string | null;
  edit_lock_expires_at?: string | null;
  editing_by_name?: string;
  is_locked?: boolean;
  locked_by_current_user?: boolean;
}

export interface PaperField {
  field_name: string;
  display_name: string;
  field_type: 'float' | 'integer' | 'text' | 'choice' | 'boolean';
}

// Speed App Types (labels are in model verbose_name; only Speed1..Speed26 are stored)
export interface Speed {
  id: string;
  Roll_Number?: string | null;
  Speed1?: number | null;
  Speed2?: number | null;
  Speed3?: number | null;
  Speed4?: number | null;
  Speed5?: number | null;
  Speed6?: number | null;
  Speed7?: number | null;
  Speed8?: number | null;
  Speed9?: number | null;
  Speed10?: number | null;
  Speed11?: number | null;
  Speed12?: number | null;
  Speed13?: number | null;
  Speed14?: number | null;
  Speed15?: number | null;
  Speed16?: number | null;
  Speed17?: number | null;
  Speed18?: number | null;
  Speed19?: number | null;
  Speed20?: number | null;
  Speed21?: number | null;
  Speed22?: number | null;
  Speed23?: number | null;
  Speed24?: number | null;
  Speed25?: number | null;
  Speed26?: number | null;
  created_at: string;
  last_updated: string;
}

// Navigation and App State
export type AppSection =
  | 'dashboard'
  | 'paper'
  | 'pulp'
  | 'settings'
  | 'logs'
  | 'report'
  | 'technical-report'
  | 'qc'
  | 'complete-report'
  | 'speed';

export interface AppState {
  currentUser: User | null;
  currentSection: AppSection;
  isLoading: boolean;
}