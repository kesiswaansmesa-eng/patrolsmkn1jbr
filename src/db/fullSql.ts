export const FULL_SUPABASE_SQL = `-- ==============================================================================
-- PATROL SMESA - SKEMA DATABASE & KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- SMK NEGERI 1 JEMBER (Project: Patrolsmkn1jbr)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPE ENUM
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'kepala_sekolah', 'tim_kesiswaan', 'kkk', 'wali_kelas');
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

-- 3. TABEL: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nip TEXT,
    role user_role_enum NOT NULL DEFAULT 'wali_kelas',
    assigned_department_id UUID,
    assigned_class_id UUID,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 4. TABEL: TAHUN AJARAN & SEMESTER
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 5. TABEL: JURUSAN / KOMPETENSI KEAHLIAN (SMKN 1 JEMBER)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    head_name TEXT,
    head_nip TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 6. TABEL: KELAS
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL CHECK (grade_level IN ('X', 'XI', 'XII')),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    homeroom_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    homeroom_teacher_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 7. TABEL: SISWA
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender gender_enum NOT NULL DEFAULT 'L',
    class_id UUID REFERENCES public.classes(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    phone_parent TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 8. TABEL: MASTER ALASAN KETERLAMBATAN
CREATE TABLE IF NOT EXISTS public.lateness_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pribadi', 'transportasi', 'kesehatan', 'cuaca', 'keluarga', 'lainnya')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 9. TABEL: JADWAL MASUK SEKOLAH
CREATE TABLE IF NOT EXISTS public.school_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    day_name TEXT NOT NULL,
    start_time TIME NOT NULL DEFAULT '07:00:00',
    tolerance_minutes INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 10. TABEL: TRANSAKSI KETERLAMBATAN
CREATE TABLE IF NOT EXISTS public.lateness_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL,
    student_name TEXT NOT NULL,
    nis TEXT NOT NULL,
    nisn TEXT NOT NULL,
    class_id UUID,
    class_name TEXT NOT NULL,
    department_id UUID,
    department_code TEXT NOT NULL,
    event_date DATE NOT NULL,
    day_name TEXT NOT NULL,
    arrival_time TIME NOT NULL,
    scheduled_time TIME NOT NULL DEFAULT '07:00:00',
    late_duration_minutes INT NOT NULL,
    reason_id UUID,
    reason_name TEXT NOT NULL,
    notes TEXT,
    recorded_by_id UUID,
    recorded_by_name TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    verification_status TEXT NOT NULL DEFAULT 'terverifikasi',
    followup_status follow_up_status_enum NOT NULL DEFAULT 'belum_ditindaklanjuti',
    coaching_summary TEXT,
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    cancelled_by_name TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 11. TABEL: TINDAK LANJUT PEMBINAAN
CREATE TABLE IF NOT EXISTS public.coaching_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lateness_record_id UUID REFERENCES public.lateness_records(id) ON DELETE SET NULL,
    student_id UUID NOT NULL,
    student_name TEXT NOT NULL,
    nis TEXT NOT NULL,
    class_name TEXT NOT NULL,
    department_code TEXT NOT NULL,
    coaching_date DATE NOT NULL DEFAULT CURRENT_DATE,
    officer_id UUID,
    officer_name TEXT NOT NULL,
    coaching_type TEXT NOT NULL,
    target_improvement TEXT NOT NULL,
    evaluation_result TEXT,
    next_followup_date DATE,
    status follow_up_status_enum NOT NULL DEFAULT 'dalam_pembinaan',
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 12. TABEL: AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 13. INDEKS PERFORMA
CREATE INDEX IF NOT EXISTS idx_lateness_event_date ON public.lateness_records(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lateness_student_id ON public.lateness_records(student_id);
CREATE INDEX IF NOT EXISTS idx_lateness_class_name ON public.lateness_records(class_name);
CREATE INDEX IF NOT EXISTS idx_lateness_department_code ON public.lateness_records(department_code);

-- 14. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lateness_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lateness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 15. KEBIJAKAN AKSES (POLICIES)
-- Master data dapat dibaca oleh seluruh pengguna terotentikasi & anon key
CREATE POLICY "Departments read access" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Classes read access" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Students read access" ON public.students FOR SELECT USING (true);
CREATE POLICY "Reasons read access" ON public.lateness_reasons FOR SELECT USING (true);
CREATE POLICY "Schedule read access" ON public.school_schedule FOR SELECT USING (true);

-- Lateness Records: Baca dan Tulis
CREATE POLICY "Lateness records read access" ON public.lateness_records FOR SELECT USING (true);
CREATE POLICY "Lateness records insert access" ON public.lateness_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Lateness records update access" ON public.lateness_records FOR UPDATE USING (true);

-- Coaching Records: Baca dan Tulis
CREATE POLICY "Coaching records read access" ON public.coaching_records FOR SELECT USING (true);
CREATE POLICY "Coaching records insert access" ON public.coaching_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Coaching records update access" ON public.coaching_records FOR UPDATE USING (true);

-- Audit Logs: Insert dan Read
CREATE POLICY "Audit logs insert access" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Audit logs read access" ON public.audit_logs FOR SELECT USING (true);
`;
