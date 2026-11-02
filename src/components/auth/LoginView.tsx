import React, { useState, useEffect } from 'react';
import { 
  Lock, User, Eye, EyeOff, LogIn, Database, 
  AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, KeyRound
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pingGoogleSheets, getGasConfig } from '../../lib/googleSheetsClient';

interface LoginViewProps {
  onSuccessLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessLogin }) => {
  const { loginWithEmail } = useApp();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live database latency / ping test state
  const [dbPingStatus, setDbPingStatus] = useState<'testing' | 'connected' | 'offline'>('testing');
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  const testDbConnection = async () => {
    setDbPingStatus('testing');
    const { url, isConfigured } = getGasConfig();
    if (!isConfigured || !url) {
      setDbPingStatus('offline');
      return;
    }
    const res = await pingGoogleSheets(url);
    if (res.success) {
      setDbPingStatus('connected');
      setDbLatency(res.latencyMs || null);
    } else {
      setDbPingStatus('offline');
    }
  };

  useEffect(() => {
    testDbConnection();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setErrorMessage('Username atau Email wajib diisi!');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Password akun wajib dimasukkan!');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await loginWithEmail(username.trim(), password);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
      if (onSuccessLogin) {
        setTimeout(onSuccessLogin, 300);
      }
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070E1A] bg-radial from-[#0C192E] via-[#070E1A] to-[#040810] text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
      
      {/* Decorative Ambient Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md mx-auto w-full space-y-6 relative z-10 my-auto">
        
        {/* Header Branding with Official School Letterhead Logos */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
            {/* Logo Provinsi Jawa Timur */}
            <div className="w-14 h-16 sm:w-16 sm:h-18 flex-shrink-0 flex items-center justify-center">
              <img 
                src="https://iili.io/nhV3HBI.png" 
                alt="Logo Provinsi Jawa Timur" 
                className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              />
            </div>
            
            {/* Divider line */}
            <div className="h-12 w-px bg-slate-700/60"></div>

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
              Pemerintah Provinsi Jawa Timur &bull; Dinas Pendidikan
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
            <p className="text-xs italic text-amber-300 font-medium tracking-wide mt-1">
              &ldquo;Catat Cepat &bull; Data Akurat &bull; Pembinaan Tepat&rdquo;
            </p>
          </div>

          {/* Realtime Database Connection Bar */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] shadow-inner">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-medium">Database:</span>
              <span className="font-mono font-bold text-white">Google Sheets</span>
            </div>
            <span className="text-slate-600">&bull;</span>
            <div className="flex items-center gap-1.5">
              {dbPingStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400 font-semibold font-mono">
                    Terkoneksi {dbLatency ? `(${dbLatency}ms)` : ''}
                  </span>
                </>
              ) : dbPingStatus === 'testing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-400 font-medium">Memeriksa...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-slate-300 font-medium">Offline/Lokal</span>
                </>
              )}
            </div>
            <button
              onClick={testDbConnection}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold ml-1 cursor-pointer"
              title="Uji ulang respon koneksi database"
            >
              Uji
            </button>
          </div>
        </div>

        {/* Form Login Masuk (Username dan Password) */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Card Top Title Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 border-b border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Masuk Akun Petugas
                </h3>
                <p className="text-xs text-blue-200">
                  Masukkan username / email dan password akun resmi Anda
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleLoginSubmit} className="p-6 sm:p-7 space-y-4">
            
            {/* Feedback Error / Success */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Gagal Masuk:</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            {/* Input 1: Username / Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Username / Email Akun <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ketik username atau email akun..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Dapat menggunakan username (cth: <em>admin</em>, <em>kesiswaan</em>, <em>piket</em>) atau alamat email.
              </p>
            </div>

            {/* Input 2: Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Password Akun <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-amber-500" />
                  Terkunci & Aman
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:font-normal placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tombol Submit Masuk */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Sistem PATROL SMESA</span>
                  </>
                )}
              </button>
            </div>

            {/* Informasi Akun & Keamanan */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Informasi Autentikasi RBAC</span>
              </div>
              <p className="leading-relaxed">
                Akun pengguna dan password ditentukan secara terpusat oleh <strong>Administrator</strong> pada database Master Data. Hubungi Tim Administrator jika Anda memerlukan bantuan akses atau reset password.
              </p>
            </div>

          </form>

          {/* Footer Info Card */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
            <span>SMK NEGERI 1 JEMBER &bull; Jalan Jambu No. 17 Jember</span>
          </div>
        </div>

      </div>

      {/* Footer Copyright */}
      <footer className="text-center text-[11px] text-slate-400 py-3 relative z-10">
        &copy; {new Date().getFullYear()} SMK Negeri 1 Jember. Sistem Tracing Keterlambatan Terintegrasi Google Sheets & RBAC.
      </footer>
    </div>
  );
};
