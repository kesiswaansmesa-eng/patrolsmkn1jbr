import React, { useState, useEffect } from 'react';
import { 
  Menu, Database, ShieldAlert, 
  ChevronDown, CheckCircle2, RefreshCw, Sparkles, LogOut, ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenSettings: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenSettings, onOpenLogin }) => {
  const { 
    currentUser, switchRole, logout, isGoogleSheetsConnected, 
    refreshData, isSyncing, lastSyncedAt, isAutoSyncEnabled 
  } = useApp();
  const [timeWib, setTimeWib] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      const dateStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(now);
      setTimeWib(`${dateStr} • ${timeStr} WIB`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    await refreshData();
  };

  // 6 Akun & Peran Lengkap: admin, petugas_piket, kkk, wali_kelas, kepala_sekolah, tim_kesiswaan
  const rolesConfig: Array<{ role: UserRole; title: string; desc: string; color: string; badge: string; email: string }> = [
    {
      role: 'admin',
      title: 'Administrator',
      desc: 'Akses penuh data, pengguna, pengaturan sistem, database & audit',
      color: 'bg-purple-600',
      badge: 'ADM',
      email: 'admin@smkn1jember.sch.id',
    },
    {
      role: 'petugas_piket',
      title: 'Petugas Piket Gerbang',
      desc: 'Pencatatan cepat gerbang pagi, cetak surat izin masuk & presensi',
      color: 'bg-amber-500',
      badge: 'PKT',
      email: 'piket.gerbang@smkn1jember.sch.id',
    },
    {
      role: 'kkk',
      title: 'Ketua Jurusan (KKK)',
      desc: 'Monitoring khusus kompetensi keahlian DKV & evaluasi 8 jurusan',
      color: 'bg-teal-600',
      badge: 'KKK',
      email: 'kkk.dkv@smkn1jember.sch.id',
    },
    {
      role: 'wali_kelas',
      title: 'Wali Kelas',
      desc: 'Monitoring khusus kelas X DKV 1 & riwayat pembinaan siswa',
      color: 'bg-cyan-600',
      badge: 'WAL',
      email: 'walikelas.xdkv1@smkn1jember.sch.id',
    },
    {
      role: 'kepala_sekolah',
      title: 'Kepala Sekolah',
      desc: 'Monitoring dashboard, tren kedisiplinan & laporan resmi (Read-Only)',
      color: 'bg-blue-600',
      badge: 'KS',
      email: 'kepsek@smkn1jember.sch.id',
    },
    {
      role: 'tim_kesiswaan',
      title: 'Tim Kesiswaan',
      desc: 'Verifikasi keterlambatan, konseling, tracing berulang & surat peringatan',
      color: 'bg-emerald-600',
      badge: 'KSW',
      email: 'kesiswaan@smkn1jember.sch.id',
    },
  ];

  const handleGoToLogin = () => {
    setShowRoleModal(false);
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      logout();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-3 flex items-center justify-between shadow-xs">
        {/* Left Side: Mobile toggle + Date/Time */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {timeWib || 'Memuat waktu Asia/Jakarta...'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Supabase status, Role switcher, profile & logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Google Sheets status badge */}
          <button
            onClick={() => {
              if (currentUser.role === 'admin') {
                onOpenSettings();
              }
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
              currentUser.role === 'admin' ? 'cursor-pointer hover:bg-opacity-80' : 'cursor-default'
            } ${
              isGoogleSheetsConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
            title={
              currentUser.role === 'admin'
                ? (isGoogleSheetsConnected
                    ? `Terhubung ke Google Spreadsheet • Terakhir sinkron: ${lastSyncedAt ? lastSyncedAt.toLocaleTimeString('id-ID') : 'Baru saja'}${isAutoSyncEnabled ? ' • Realtime Auto-Sync Aktif' : ''} (Klik untuk buka Pengaturan)`
                    : 'Google Sheets belum terhubung. Klik untuk konfigurasi URL Apps Script di Pengaturan')
                : (isGoogleSheetsConnected
                    ? `Terhubung ke Google Spreadsheet (Database Live) • Terakhir sinkron: ${lastSyncedAt ? lastSyncedAt.toLocaleTimeString('id-ID') : 'Baru saja'}`
                    : 'Mode Offline / Demo Lokal')
            }
          >
            {isGoogleSheetsConnected ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <Database className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden sm:inline">
              {isGoogleSheetsConnected ? 'Google Sheets Live' : 'Mode Offline / Demo'}
            </span>
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isSyncing}
            className={`p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer ${
              isSyncing ? 'animate-spin text-emerald-600' : ''
            }`}
            title="Sinkronkan data dari Google Sheets sekarang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Role Switcher Pill (Interactive element corresponding to user selector) */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all border border-slate-700 cursor-pointer group"
            title="Uji simulasi akun berdasarkan 6 peran resmi sekolah"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="text-left hidden sm:block">
              <span className="text-[10px] text-slate-300 block leading-tight">Akun Aktif:</span>
              <span className="text-xs font-bold text-amber-300 capitalize">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <span className="sm:hidden text-amber-300 capitalize font-bold">
              {currentUser.role.replace('_', ' ')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 group-hover:text-white transition-colors" />
          </button>

          {/* User Avatar & Name */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-inner">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{currentUser.full_name}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{currentUser.email}</p>
            </div>

            {/* Logout / Ke Halaman Login Button */}
            <button
              onClick={handleGoToLogin}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1"
              title="Keluar / Buka Halaman Login"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal for RBAC Testing */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#0B1528] to-[#1E3A8A] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-base text-white">Pilih Akun / Simulasi Peran (RBAC)</h3>
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  Pilih salah satu dari 6 jenis akun resmi di SMK Negeri 1 Jember
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Roles List */}
            <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {rolesConfig.map(r => {
                const isCurrent = currentUser.role === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setShowRoleModal(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${r.color} text-white flex items-center justify-center font-black text-xs shadow-xs mt-0.5 flex-shrink-0`}>
                        {r.badge}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-[10px] bg-blue-600 text-white font-bold rounded-full">
                              Sedang Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{r.email}</p>
                        <p className="text-xs text-slate-600 mt-1">{r.desc}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Action: Go to Full Login Page */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Ke Halaman Login Penuh</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
