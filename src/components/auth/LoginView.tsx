import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Lock, ArrowRight, Database, 
  CheckCircle2, School, Clock, Users, Building2, 
  AlertCircle, KeyRound, ShieldAlert, Award, HeartHandshake,
  Activity, RefreshCw, Eye, EyeOff, X, LogIn
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole, UserProfile } from '../../types';
import { getSupabase, getSupabaseConfig } from '../../lib/supabaseClient';

interface LoginViewProps {
  onSuccessLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessLogin }) => {
  const { users, loginWithEmail } = useApp();
  
  // Selected user for password verification modal
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<UserProfile | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live database latency / ping test state
  const [dbPingStatus, setDbPingStatus] = useState<'testing' | 'connected' | 'offline'>('testing');
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  const testDbConnection = async () => {
    setDbPingStatus('testing');
    const start = performance.now();
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setDbPingStatus('offline');
        return;
      }
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const elapsed = Math.round(performance.now() - start);
      if (!error) {
        setDbPingStatus('connected');
        setDbLatency(elapsed);
      } else {
        setDbPingStatus('connected');
        setDbLatency(elapsed);
      }
    } catch {
      setDbPingStatus('offline');
    }
  };

  useEffect(() => {
    testDbConnection();
  }, []);

  // Map 6 official roles with live data from `users` in Master Data
  const roleCardsMeta: Array<{
    role: UserRole;
    title: string;
    badgeLabel: string;
    scope: string;
    badgeColor: string;
    headerBg: string;
    borderHover: string;
    buttonColor: string;
    icon: React.ElementType;
    description: string;
    keyTasks: string[];
  }> = [
    {
      role: 'admin',
      title: 'Administrator',
      badgeLabel: 'Hak Akses Penuh (Root)',
      scope: 'Sistem, Database & Master Data',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      headerBg: 'bg-purple-50/70',
      borderHover: 'hover:border-purple-500 hover:shadow-purple-500/10',
      buttonColor: 'bg-purple-700 hover:bg-purple-800 focus:ring-purple-400',
      icon: ShieldCheck,
      description: 'Manajemen pengguna & hak akses (RBAC), set password akun, sinkronisasi Supabase, impor/ekspor data rombel & audit log.',
      keyTasks: ['Master Data Akun & Password', 'Konfigurasi Supabase Database', 'Audit Trail Aktivitas'],
    },
    {
      role: 'petugas_piket',
      title: 'Petugas Piket Gerbang',
      badgeLabel: 'Gerbang Pagi Hari',
      scope: 'Piket Gerbang & Presensi Keterlambatan',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      headerBg: 'bg-amber-50/70',
      borderHover: 'hover:border-amber-500 hover:shadow-amber-500/10',
      buttonColor: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-400',
      icon: Clock,
      description: 'Pencatatan kilat siswa terlambat di gerbang utama, cetak Surat Izin Masuk (SIM), dan deteksi duplikasi presensi harian.',
      keyTasks: ['Catat Cepat Siswa Terlambat', 'Terbitkan Surat Izin Masuk (SIM)', 'Cek Status Kehadiran Hari Ini'],
    },
    {
      role: 'kkk',
      title: 'Ketua Jurusan (KKK)',
      badgeLabel: 'Kompetensi Keahlian',
      scope: 'Kompetensi Keahlian DKV (8 Jurusan)',
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      headerBg: 'bg-teal-50/70',
      borderHover: 'hover:border-teal-500 hover:shadow-teal-500/10',
      buttonColor: 'bg-teal-700 hover:bg-teal-800 focus:ring-teal-400',
      icon: Building2,
      description: 'Monitoring kedisiplinan dan tren keterlambatan siswa khusus dalam kompetensi keahlian / jurusan binaan.',
      keyTasks: ['Statistik Keterlambatan Jurusan', 'Evaluasi Kedisiplinan Siswa DKV', 'Koordinasi Pembinaan Karakter'],
    },
    {
      role: 'wali_kelas',
      title: 'Wali Kelas',
      badgeLabel: 'Kelas Binaan',
      scope: 'Rombel Binaan (Kelas X DKV 1)',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
      headerBg: 'bg-cyan-50/70',
      borderHover: 'hover:border-cyan-500 hover:shadow-cyan-500/10',
      buttonColor: 'bg-cyan-700 hover:bg-cyan-800 focus:ring-cyan-400',
      icon: Users,
      description: 'Pemantauan presensi dan rekap keterlambatan siswa dalam kelas asuhan, pendampingan pembinaan, dan tindak lanjut ke wali murid.',
      keyTasks: ['Rekap Keterlambatan Kelas', 'Notifikasi Siswa Terlambat', 'Riwayat Surat Izin Masuk'],
    },
    {
      role: 'kepala_sekolah',
      title: 'Kepala Sekolah',
      badgeLabel: 'Pimpinan Eksekutif',
      scope: 'Seluruh Ekosistem Sekolah',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      headerBg: 'bg-blue-50/70',
      borderHover: 'hover:border-blue-500 hover:shadow-blue-500/10',
      buttonColor: 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-400',
      icon: Award,
      description: 'Dashboard eksekutif, rekapitulasi kedisiplinan semesteran, monitoring kinerja gerbang pagi, dan pengesahan laporan resmi.',
      keyTasks: ['Executive Dashboard & Tren Sekolah', 'Leaderboard Kedisiplinan Jurusan', 'Pengesahan Laporan Dinas Jatim'],
    },
    {
      role: 'tim_kesiswaan',
      title: 'Tim Kesiswaan',
      badgeLabel: 'Tata Tertib & Karakter',
      scope: 'Ketertiban Sekolah & BK',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      headerBg: 'bg-emerald-50/70',
      borderHover: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      buttonColor: 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-400',
      icon: HeartHandshake,
      description: 'Verifikasi status keterlambatan, penanganan siswa berulang (SP 1, SP 2, SP 3), konseling pembinaan, dan panggilan orang tua.',
      keyTasks: ['Verifikasi Data Keterlambatan', 'Tracing & Surat Peringatan (SP)', 'Pencatatan Hasil Konseling Karakter'],
    },
  ];

  // Open password verification modal for a specific user
  const handleSelectAccountToLogin = (role: UserRole) => {
    // Find active user from master data
    const matchedUser = users.find(u => u.role === role) || {
      id: 'user-' + role,
      email: `${role}@smkn1jember.sch.id`,
      full_name: `Pengguna ${role.toUpperCase().replace('_', ' ')}`,
      role,
      password: '',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setSelectedUserForLogin(matchedUser);
    setModalPassword('');
    setShowModalPassword(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Submit password in modal
  const handleModalPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForLogin) return;

    if (!modalPassword.trim()) {
      setErrorMessage('Password wajib dimasukkan! Silakan masukkan password akun Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await loginWithEmail(selectedUserForLogin.email, modalPassword);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
      setSelectedUserForLogin(null);
      if (onSuccessLogin) {
        setTimeout(onSuccessLogin, 250);
      }
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070E1A] bg-radial from-[#0C192E] via-[#070E1A] to-[#040810] text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto w-full space-y-6 relative z-10 my-auto">
        
        {/* Header Branding with Official School Letterhead Logos */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-2">
            {/* Logo Provinsi Jawa Timur */}
            <div className="w-14 h-16 sm:w-18 sm:h-20 flex-shrink-0 flex items-center justify-center">
              <img 
                src="https://iili.io/nhV3HBI.png" 
                alt="Logo Provinsi Jawa Timur" 
                className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              />
            </div>
            
            {/* Divider line */}
            <div className="h-12 w-px bg-slate-700/60 hidden sm:block"></div>

            {/* Logo SMK Negeri 1 Jember */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-xl flex-shrink-0 flex items-center justify-center border-2 border-amber-400/50 shadow-amber-400/10">
              <img 
                src="https://iili.io/nhMcBoB.md.png" 
                alt="Logo SMKN 1 Jember" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Pemerintah Provinsi Jawa Timur • Dinas Pendidikan
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide mt-0.5">
              SEKOLAH MENENGAH KEJURUAN NEGERI 1 JEMBER
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs shadow-amber-400/20">
                PATROL SMESA
              </span>
              <span className="text-xs text-blue-300 font-semibold">
                Sistem Tracing Keterlambatan Siswa
              </span>
            </div>
            <p className="text-xs sm:text-sm italic text-amber-300 font-medium tracking-wide mt-1">
              “Catat Cepat • Data Akurat • Pembinaan Tepat”
            </p>
          </div>

          {/* Realtime Database Connection Bar */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs shadow-inner">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Supabase Database:</span>
              <span className="font-mono font-bold text-white">Patrolsmkn1jbr</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              {dbPingStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400 font-semibold font-mono text-[11px]">
                    Live Terkoneksi {dbLatency ? `(${dbLatency}ms)` : ''}
                  </span>
                </>
              ) : dbPingStatus === 'testing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-400 font-medium text-[11px]">Memeriksa Database...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-slate-300 font-medium text-[11px]">Mode Standby</span>
                </>
              )}
            </div>
            <button
              onClick={testDbConnection}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold ml-1 cursor-pointer"
              title="Uji ulang respon koneksi database"
            >
              Uji Koneksi
            </button>
          </div>
        </div>

        {/* Notice: Wajib Masukkan Password Tanpa Bocoran */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-slate-300 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-100">Otorisasi Akses Pengguna:</span> Silakan pilih akun tugas Anda di bawah dan masukkan <strong>password akun resmi</strong> yang telah ditentukan oleh Administrator.
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Wajib Password Akun
          </span>
        </div>

        {/* Main Authentication Container - Direct Account Selection */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Card Top Title Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Pilih Akun Tugas & Masukkan Password
                </h3>
                <p className="text-xs text-blue-200">
                  Sistem Informasi Presensi & Penertiban Keterlambatan Siswa Terintegrasi RBAC
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl w-fit">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Password Diset oleh Admin</span>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mx-6 mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Autentikasi Gagal:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mx-6 mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Grid of 6 Account Cards */}
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 pb-1 border-b border-slate-100">
              <span className="font-medium">
                Pilih salah satu dari <strong className="text-slate-800">6 akun jabatan resmi</strong> di bawah untuk membuka form verifikasi password:
              </span>
              <span className="font-mono text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 w-fit">
                Pilih Akun
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleCardsMeta.map(meta => {
                const Icon = meta.icon;
                // Pull active user info from users state
                const activeUser = users.find(u => u.role === meta.role) || {
                  id: 'user-' + meta.role,
                  email: `${meta.role}@smkn1jember.sch.id`,
                  full_name: `Pengguna ${meta.role.toUpperCase()}`,
                  role: meta.role,
                  nip: '',
                  status: 'active',
                  created_at: '',
                };

                return (
                  <div
                    key={meta.role}
                    className={`rounded-2xl border border-slate-200 transition-all flex flex-col justify-between group overflow-hidden bg-white shadow-xs ${meta.borderHover}`}
                  >
                    {/* Card Top Header */}
                    <div className={`p-4 border-b border-slate-100 ${meta.headerBg}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border tracking-wide uppercase ${meta.badgeColor}`}>
                          {meta.title}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono font-semibold bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                          {activeUser.nip ? `NIP. ${activeUser.nip}` : 'Akses Resmi'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs flex-shrink-0 ${meta.buttonColor.split(' ')[0]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">
                            {activeUser.full_name}
                          </h3>
                          <p className="text-[11px] text-slate-600 font-mono font-semibold truncate">
                            {activeUser.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Body: Scope & Duties */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Ruang Lingkup Tugas:
                          </span>
                          <span className="text-slate-800 font-semibold text-xs">
                            {meta.scope}
                          </span>
                        </div>

                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {meta.description}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Fitur & Otoritas:
                          </span>
                          {meta.keyTasks.map((task, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Action Button -> Opens Password Modal (Mandatory password entry, NO password hint shown) */}
                      <div className="pt-3 border-t border-slate-100 mt-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleSelectAccountToLogin(meta.role)}
                          className={`w-full py-2.5 px-3 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${meta.buttonColor}`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pilih Akun & Masukkan Password</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* School Contact Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
            <span>SMK NEGERI 1 JEMBER • Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690</span>
            <span className="hidden sm:inline"> • Website: www.smknegeri1jember.sch.id</span>
          </div>
        </div>
      </div>

      {/* MODAL: Input Password Login Akun (Enforces password for card selection without revealing helper passwords) */}
      {selectedUserForLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#0C192E] to-[#1E3A8A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Masukkan Password Login</h3>
                  <p className="text-xs text-blue-200 capitalize">
                    Peran: {selectedUserForLogin.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForLogin(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleModalPasswordSubmit} className="p-6 space-y-4">
              {/* Account Card Snippet */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-inner flex-shrink-0">
                  {selectedUserForLogin.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {selectedUserForLogin.full_name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {selectedUserForLogin.email}
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password Akun * (Wajib Diisi)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Terkunci & Aman
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Masukkan password akun Anda..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showModalPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                  <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Keamanan Password Terproteksi
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Password diatur secara mandiri oleh Administrator di menu <strong>Master Data Akun & Hak Akses (RBAC)</strong>. Hubungi Administrator jika Anda lupa password.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserForLogin(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>Masuk Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="text-center text-[11px] text-slate-400 py-3 relative z-10">
        © {new Date().getFullYear()} SMK Negeri 1 Jember. Sistem Tracing Keterlambatan Terintegrasi Supabase & RBAC.
      </footer>
    </div>
  );
};
