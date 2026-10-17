export const FULL_SUPABASE_SQL = `-- ==============================================================================
-- PATROL SMESA - SKEMA DATABASE RESMI & KEBIJAKAN AKSES LENGKAP
-- SMK NEGERI 1 JEMBER (Project: Patrolsmkn1jbr)
-- Catatan: Menggunakan TEXT PRIMARY KEY agar kompatibel dengan seluruh ID aplikasi
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPE ENUM (Opsional / Safe)
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'kepala_sekolah', 'tim_kesiswaan', 'petugas_piket', 'kkk', 'wali_kelas');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE follow_up_status_enum AS ENUM ('belum_ditindaklanjuti', 'dijadwalkan', 'dalam_pembinaan', 'selesai', 'dirujuk');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('L', 'P');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL: PROFILES (Akun & Hak Akses)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nip TEXT,
    role TEXT NOT NULL DEFAULT 'wali_kelas',
    password TEXT DEFAULT 'smesa123',
    assigned_department_id TEXT,
    assigned_class_id TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 4. TABEL: JURUSAN / KOMPETENSI KEAHLIAN (SMKN 1 JEMBER)
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    head_name TEXT,
    head_nip TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    total_students INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 5. TABEL: KELAS (ROMBEL)
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    department_id TEXT,
    department_code TEXT,
    homeroom_teacher_name TEXT,
    homeroom_teacher_id TEXT,
    academic_year TEXT DEFAULT '2024/2025',
    total_students INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 6. TABEL: SISWA
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'L',
    class_id TEXT,
    class_name TEXT NOT NULL,
    department_id TEXT,
    department_code TEXT NOT NULL,
    phone_parent TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 7. TABEL: MASTER ALASAN KETERLAMBATAN
CREATE TABLE IF NOT EXISTS public.lateness_reasons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'pribadi',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 8. TABEL: JADWAL MASUK SEKOLAH
CREATE TABLE IF NOT EXISTS public.school_schedule (
    id TEXT PRIMARY KEY,
    day_of_week INT NOT NULL,
    day_name TEXT NOT NULL,
    start_time TIME NOT NULL DEFAULT '07:00:00',
    tolerance_minutes INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 9. TABEL: TRANSAKSI KETERLAMBATAN (Lateness Records)
CREATE TABLE IF NOT EXISTS public.lateness_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    nis TEXT NOT NULL,
    nisn TEXT NOT NULL,
    class_id TEXT,
    class_name TEXT NOT NULL,
    department_id TEXT,
    department_code TEXT NOT NULL,
    event_date DATE NOT NULL,
    day_name TEXT NOT NULL,
    arrival_time TIME NOT NULL,
    scheduled_time TIME NOT NULL DEFAULT '07:00:00',
    late_duration_minutes INT NOT NULL,
    reason_id TEXT,
    reason_name TEXT NOT NULL,
    notes TEXT,
    recorded_by_id TEXT,
    recorded_by_name TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    verification_status TEXT NOT NULL DEFAULT 'terverifikasi',
    followup_status TEXT NOT NULL DEFAULT 'belum_ditindaklanjuti',
    coaching_summary TEXT,
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    cancelled_by_name TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 10. TABEL: TINDAK LANJUT PEMBINAAN (Coaching Records)
CREATE TABLE IF NOT EXISTS public.coaching_records (
    id TEXT PRIMARY KEY,
    lateness_record_id TEXT,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    nis TEXT NOT NULL,
    class_name TEXT NOT NULL,
    department_code TEXT NOT NULL,
    coaching_date DATE NOT NULL DEFAULT CURRENT_DATE,
    officer_id TEXT,
    officer_name TEXT NOT NULL,
    coaching_type TEXT NOT NULL,
    target_improvement TEXT NOT NULL,
    evaluation_result TEXT,
    next_followup_date DATE,
    status TEXT NOT NULL DEFAULT 'dalam_pembinaan',
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 11. TABEL: AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 12. TABEL: PENGATURAN APLIKASI
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 13. INDEKS PERFORMA
CREATE INDEX IF NOT EXISTS idx_lateness_event_date ON public.lateness_records(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lateness_student_id ON public.lateness_records(student_id);
CREATE INDEX IF NOT EXISTS idx_lateness_class_name ON public.lateness_records(class_name);
CREATE INDEX IF NOT EXISTS idx_lateness_department_code ON public.lateness_records(department_code);

-- 14. AKTIFKAN ROW LEVEL SECURITY (RLS) & IZINKAN AKSES PENUH PUBLIK / ANON
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lateness_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lateness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 15. DROP POLICIES JIKA SUDAH ADA SEBELUMNYA (MENCEGAH DUPLIKASI ERROR)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all for profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow all for departments" ON public.departments;
    DROP POLICY IF EXISTS "Allow all for classes" ON public.classes;
    DROP POLICY IF EXISTS "Allow all for students" ON public.students;
    DROP POLICY IF EXISTS "Allow all for lateness_reasons" ON public.lateness_reasons;
    DROP POLICY IF EXISTS "Allow all for school_schedule" ON public.school_schedule;
    DROP POLICY IF EXISTS "Allow all for lateness_records" ON public.lateness_records;
    DROP POLICY IF EXISTS "Allow all for coaching_records" ON public.coaching_records;
    DROP POLICY IF EXISTS "Allow all for audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Allow all for app_settings" ON public.app_settings;
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- 16. BIKIN KEBIJAKAN AKSES LENGKAP (SELECT, INSERT, UPDATE, DELETE) UNTUK SEMUA ROLE
CREATE POLICY "Allow all for profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for lateness_reasons" ON public.lateness_reasons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for school_schedule" ON public.school_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for lateness_records" ON public.lateness_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for coaching_records" ON public.coaching_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
`;
