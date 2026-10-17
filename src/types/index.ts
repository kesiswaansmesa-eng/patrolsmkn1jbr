export type UserRole = 'admin' | 'kepala_sekolah' | 'tim_kesiswaan' | 'petugas_piket' | 'kkk' | 'wali_kelas';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  password?: string;
  nip?: string;
  assigned_department_id?: string; // For KKK
  assigned_class_id?: string; // For Wali Kelas
  avatar_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  code: string; // e.g. 'DKV', 'AK', 'MP', 'BD', 'PSPT', 'ULW', 'TL', 'KKBT'
  name: string; // e.g. 'Desain Komunikasi Visual'
  head_name?: string; // Nama KKK
  head_nip?: string;
  is_active: boolean;
  total_students?: number;
}

export interface ClassRoom {
  id: string;
  code: string; // e.g. 'X-DKV-1'
  name: string; // e.g. 'X DKV 1'
  grade_level: 'X' | 'XI' | 'XII';
  department_id: string;
  department_code: string;
  homeroom_teacher_name?: string;
  homeroom_teacher_id?: string;
  academic_year: string;
  total_students?: number;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  full_name: string;
  gender: 'L' | 'P';
  class_id: string;
  class_name: string;
  department_id: string;
  department_code: string;
  academic_year: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  phone_parent?: string;
  address?: string;
  total_lateness?: number; // computed
}

export interface LatenessReason {
  id: string;
  code: string;
  name: string;
  category: 'pribadi' | 'transportasi' | 'kesehatan' | 'cuaca' | 'keluarga' | 'lainnya';
  is_active: boolean;
  description?: string;
}

export type FollowUpStatus = 
  | 'belum_ditindaklanjuti' 
  | 'dijadwalkan' 
  | 'dalam_pembinaan' 
  | 'selesai' 
  | 'dirujuk';

export interface LatenessRecord {
  id: string;
  student_id: string;
  student_name: string;
  nis: string;
  nisn: string;
  class_id: string;
  class_name: string;
  department_id: string;
  department_code: string;
  
  event_date: string; // YYYY-MM-DD
  day_name: string; // Senin, Selasa, dll
  arrival_time: string; // HH:MM:SS
  scheduled_time: string; // HH:MM:SS
  late_duration_minutes: number;
  
  reason_id: string;
  reason_name: string;
  notes?: string;
  
  recorded_by_id: string;
  recorded_by_name: string;
  recorded_at: string; // Timestamp ISO
  
  verification_status: 'terverifikasi' | 'menunggu' | 'ditolak';
  followup_status: FollowUpStatus;
  coaching_summary?: string;
  
  is_cancelled?: boolean;
  cancellation_reason?: string;
  cancelled_by_name?: string;
  cancelled_at?: string;
  
  created_at: string;
}

export interface CoachingRecord {
  id: string;
  lateness_record_id?: string;
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  department_code: string;
  
  coaching_date: string;
  officer_id: string;
  officer_name: string;
  coaching_type: 'konseling' | 'refleksi_tertulis' | 'pendampingan_wali_kelas' | 'komunikasi_orang_tua' | 'pembinaan_karakter' | 'surat_peringatan';
  target_improvement: string;
  evaluation_result?: string;
  next_followup_date?: string;
  status: FollowUpStatus;
  is_confidential: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email: string;
  user_name: string;
  user_role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'VERIFY' | 'LOGIN' | 'IMPORT' | 'EXPORT';
  module: string;
  target_id?: string;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface SchoolSchedule {
  day_of_week: number; // 1 = Senin, 5 = Jumat, 6 = Sabtu
  day_name: string;
  start_time: string; // '07:00'
  tolerance_minutes: number; // e.g. 0 or 5
  is_active: boolean;
}

export interface AppSettings {
  school_name: string;
  school_tagline: string;
  school_address: string;
  default_start_time: string;
  academic_year: string;
  semester: 'Ganjil' | 'Genap';
  warning_threshold_sp1: number; // e.g. 3 times
  warning_threshold_sp2: number; // e.g. 5 times
  warning_threshold_sp3: number; // e.g. 8 times
  allow_same_day_duplicate: boolean;
  
  // Leadership & Document Signatures (Pimpinan & Pengesahan Dokumen)
  headmaster_name: string;      // Nama Kepala Sekolah lengkap dengan gelar
  headmaster_nip: string;       // NIP Kepala Sekolah
  vice_headmaster_name: string; // Nama Wakil Kepala Sekolah Bidang Kesiswaan
  vice_headmaster_nip: string;  // NIP Waka Kesiswaan
  city: string;                 // Kota penandatanganan dokumen (cth: Jember)
}

export interface DashboardFilter {
  startDate: string;
  endDate: string;
  departmentCode: string;
  classId: string;
  academicYear: string;
  semester: string;
  followupStatus: string;
  reasonId: string;
}
