import React, { useState, useEffect } from 'react';
import { 
  Menu, Bell, Database, ShieldAlert, UserCheck, 
  ChevronDown, CheckCircle2, AlertCircle, RefreshCw, Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenSettings }) => {
  const { currentUser, switchRole, isSupabaseConnected, refreshData } = useApp();
  const [timeWib, setTimeWib] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const rolesConfig: Array<{ role: UserRole; title: string; desc: string; color: string }> = [
    {
      role: 'admin',
      title: 'Administrator',
      desc: 'Akses penuh data, pengguna, pengaturan sistem & audit',
      color: 'bg-purple-600',
    },
    {
      role: 'kepala_sekolah',
      title: 'Kepala Sekolah',
      desc: 'Monitoring dashboard, tren kedisiplinan & laporan (Read-Only)',
      color: 'bg-blue-600',
    },
    {
      role: 'tim_kesiswaan',
      title: 'Tim Kesiswaan',
      desc: 'Pencatatan gerbang pagi, verifikasi & tindak lanjut pembinaan',
      color: 'bg-emerald-600',
    },
    {
      role: 'kkk',
      title: 'Ketua Jurusan (KKK)',
      desc: 'Monitoring khusus kompetensi keahlian DKV & evaluasi kelas',
      color: 'bg-amber-600',
    },
    {
      role: 'wali_kelas',
      title: 'Wali Kelas',
      desc: 'Monitoring khusus kelas X DKV 1 & riwayat pembinaan siswa',
      color: 'bg-cyan-600',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-3 flex items-center justify-between shadow-xs">
        {/* Left Side: Mobile toggle + Date/Time */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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

        {/* Right Side: Supabase status, Role switcher & profile */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Supabase status badge */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title="Klik untuk konfigurasi database Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isSupabaseConnected ? 'Supabase Live' : 'Mode Demo / Offline'}
            </span>
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all ${
              isRefreshing ? 'animate-spin text-blue-600' : ''
            }`}
            title="Muat ulang data terbaru"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Role Switcher Pill (Critical for RBAC demo testing) */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all border border-slate-700"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <div className="text-left hidden sm:block">
              <span className="text-[10px] text-slate-300 block leading-tight">Uji Peran (RBAC):</span>
              <span className="text-xs font-bold text-amber-300 capitalize">{currentUser.role.replace('_', ' ')}</span>
            </div>
            <span className="sm:hidden text-amber-300 capitalize font-bold">
              {currentUser.role.replace('_', ' ')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* User Avatar & Name */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-inner">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{currentUser.full_name}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal for RBAC Testing */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-base text-white">Simulasi Akun & Hak Akses (RBAC)</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Uji antarmuka dan pembatasan data untuk 5 jenis akun di SMK Negeri 1 Jember
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {rolesConfig.map(r => {
                const isCurrent = currentUser.role === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setShowRoleModal(false);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${r.color} text-white flex items-center justify-center font-bold text-xs shadow-xs mt-0.5`}>
                        {r.role === 'admin' ? 'ADM' :
                         r.role === 'kepala_sekolah' ? 'KS' :
                         r.role === 'tim_kesiswaan' ? 'KSW' :
                         r.role === 'kkk' ? 'KKK' : 'WAL'}
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
                        <p className="text-xs text-slate-600 mt-0.5">{r.desc}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
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
