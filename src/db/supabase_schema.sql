-- ==============================================================================
-- PATROL SMESA - SKEMA DATABASE & KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- SMK NEGERI 1 JEMBER
-- Versi: 1.0.0 (PostgreSQL / Supabase)
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

-- 3. TABEL: PROFILES (User & Hak Akses)
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
    name TEXT UNIQUE NOT NULL, -- e.g. '2024/2025'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Ganjil' / 'Genap'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 5. TABEL: JURUSAN / KOMPETENSI KEAHLIAN (SMKN 1 JEMBER)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- AK, MP, BD, DKV, PSPT, ULW, TL, KKBT
    name TEXT NOT NULL,
    head_name TEXT,
    head_nip TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 6. TABEL: KELAS
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- 'X-DKV-1', 'XI-AK-2'
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

-- 8. TABEL: RIWAYAT KEANGGOTAAN KELAS SISWA (Class Memberships)
CREATE TABLE IF NOT EXISTS public.class_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 9. TABEL: PENUGASAN (Wali Kelas & KKK)
CREATE TABLE IF NOT EXISTS public.class_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

CREATE TABLE IF NOT EXISTS public.department_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    head_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 10. TABEL: MASTER ALASAN KETERLAMBATAN
CREATE TABLE IF NOT EXISTS public.lateness_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pribadi', 'transportasi', 'kesehatan', 'cuaca', 'keluarga', 'lainnya')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 11. TABEL: JADWAL MASUK SEKOLAH (School Schedule)
CREATE TABLE IF NOT EXISTS public.school_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Senin, 5=Jumat
    day_name TEXT NOT NULL,
    start_time TIME NOT NULL DEFAULT '07:00:00',
    tolerance_minutes INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 12. TABEL: TRANSAKSI KETERLAMBATAN (Lateness Records)
CREATE TABLE IF NOT EXISTS public.lateness_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    student_name TEXT NOT NULL,
    nis TEXT NOT NULL,
    nisn TEXT NOT NULL,
    
    -- Snapshot historis kelas & jurusan saat kejadian (tidak berubah retroaktif)
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    class_name TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    department_code TEXT NOT NULL,
    
    event_date DATE NOT NULL,
    day_name TEXT NOT NULL,
    arrival_time TIME NOT NULL,
    scheduled_time TIME NOT NULL DEFAULT '07:00:00',
    late_duration_minutes INT NOT NULL,
    
    reason_id UUID NOT NULL REFERENCES public.lateness_reasons(id) ON DELETE RESTRICT,
    reason_name TEXT NOT NULL,
    notes TEXT,
    
    recorded_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_by_name TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    
    verification_status TEXT NOT NULL DEFAULT 'terverifikasi' CHECK (verification_status IN ('terverifikasi', 'menunggu', 'ditolak')),
    followup_status follow_up_status_enum NOT NULL DEFAULT 'belum_ditindaklanjuti',
    coaching_summary TEXT,
    
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    cancelled_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_by_name TEXT,
    cancelled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 13. TABEL: TINDAK LANJUT PEMBINAAN (Coaching Records)
CREATE TABLE IF NOT EXISTS public.coaching_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lateness_record_id UUID REFERENCES public.lateness_records(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    nis TEXT NOT NULL,
    class_name TEXT NOT NULL,
    department_code TEXT NOT NULL,
    
    coaching_date DATE NOT NULL DEFAULT CURRENT_DATE,
    officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    officer_name TEXT NOT NULL,
    coaching_type TEXT NOT NULL CHECK (coaching_type IN ('konseling', 'refleksi_tertulis', 'pendampingan_wali_kelas', 'komunikasi_orang_tua', 'pembinaan_karakter', 'surat_peringatan')),
    target_improvement TEXT NOT NULL,
    evaluation_result TEXT,
    next_followup_date DATE,
    status follow_up_status_enum NOT NULL DEFAULT 'dalam_pembinaan',
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 14. TABEL: AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    details TEXT NOT NULL,
    ip_address TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 15. TABEL: PENGATURAN APLIKASI
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- ==============================================================================
-- INDEKS PERFORMA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_lateness_event_date ON public.lateness_records(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lateness_student_id ON public.lateness_records(student_id);
CREATE INDEX IF NOT EXISTS idx_lateness_class_id ON public.lateness_records(class_id);
CREATE INDEX IF NOT EXISTS idx_lateness_department_code ON public.lateness_records(department_code);
CREATE INDEX IF NOT EXISTS idx_lateness_followup_status ON public.lateness_records(followup_status);
CREATE INDEX IF NOT EXISTS idx_students_nis ON public.students(nis);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);

-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lateness_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lateness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Helper Function: Dapatkan peran pengguna saat ini
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS user_role_enum AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper Function: Dapatkan assigned class ID pengguna saat ini
CREATE OR REPLACE FUNCTION public.get_current_assigned_class()
RETURNS UUID AS $$
  SELECT assigned_class_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper Function: Dapatkan assigned department ID pengguna saat ini
CREATE OR REPLACE FUNCTION public.get_current_assigned_department()
RETURNS UUID AS $$
  SELECT assigned_department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS POLICIES: PROFILES
CREATE POLICY "Profiles readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.get_current_role() = 'admin' OR auth.uid() = id);

CREATE POLICY "Admin can update all profiles, users can update own name"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_current_role() = 'admin' OR auth.uid() = id)
WITH CHECK (public.get_current_role() = 'admin' OR auth.uid() = id);

-- RLS POLICIES: MASTER DATA (READABLE BY ALL AUTHENTICATED)
CREATE POLICY "Departments read by all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Classes read by all" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students read by role" ON public.students FOR SELECT TO authenticated USING (
    public.get_current_role() IN ('admin', 'kepala_sekolah', 'tim_kesiswaan')
    OR (public.get_current_role() = 'kkk' AND department_id = public.get_current_assigned_department())
    OR (public.get_current_role() = 'wali_kelas' AND class_id = public.get_current_assigned_class())
);
CREATE POLICY "Lateness reasons read by all" ON public.lateness_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "School schedule read by all" ON public.school_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Academic years read by all" ON public.academic_years FOR SELECT TO authenticated USING (true);

-- RLS POLICIES: TRANSAKSI KETERLAMBATAN (LATENESS RECORDS)
-- SELECT:
CREATE POLICY "Lateness records select policy"
ON public.lateness_records FOR SELECT
TO authenticated
USING (
    public.get_current_role() IN ('admin', 'kepala_sekolah', 'tim_kesiswaan')
    OR (public.get_current_role() = 'kkk' AND department_id = public.get_current_assigned_department())
    OR (public.get_current_role() = 'wali_kelas' AND class_id = public.get_current_assigned_class())
);

-- INSERT: Petugas Kesiswaan & Admin dapat mencatat
CREATE POLICY "Lateness records insert policy"
ON public.lateness_records FOR INSERT
TO authenticated
WITH CHECK (
    public.get_current_role() IN ('admin', 'tim_kesiswaan')
);

-- UPDATE: Petugas Kesiswaan & Admin dapat verifikasi dan pembinaan
CREATE POLICY "Lateness records update policy"
ON public.lateness_records FOR UPDATE
TO authenticated
USING (
    public.get_current_role() IN ('admin', 'tim_kesiswaan')
)
WITH CHECK (
    public.get_current_role() IN ('admin', 'tim_kesiswaan')
);

-- DELETE: Hanya Admin
CREATE POLICY "Lateness records delete policy"
ON public.lateness_records FOR DELETE
TO authenticated
USING (
    public.get_current_role() = 'admin'
);

-- RLS POLICIES: COACHING RECORDS
CREATE POLICY "Coaching records select policy"
ON public.coaching_records FOR SELECT
TO authenticated
USING (
    public.get_current_role() IN ('admin', 'kepala_sekolah', 'tim_kesiswaan')
    OR (public.get_current_role() = 'kkk' AND department_code IN (SELECT code FROM public.departments WHERE id = public.get_current_assigned_department()) AND is_confidential = false)
    OR (public.get_current_role() = 'wali_kelas' AND class_name IN (SELECT name FROM public.classes WHERE id = public.get_current_assigned_class()) AND is_confidential = false)
);

CREATE POLICY "Coaching records insert policy"
ON public.coaching_records FOR INSERT
TO authenticated
WITH CHECK (
    public.get_current_role() IN ('admin', 'tim_kesiswaan')
);

-- RLS POLICIES: AUDIT LOGS
CREATE POLICY "Audit logs select policy"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.get_current_role() = 'admin');

CREATE POLICY "Audit logs insert policy"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
