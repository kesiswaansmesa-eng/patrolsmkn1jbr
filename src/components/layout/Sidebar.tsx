import React from 'react';
import { 
  LayoutDashboard, UserCheck, Clock, Users, School, 
  Building2, UserCog, BarChart3, Trophy, HeartHandshake, 
  FileText, ShieldCheck, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export type NavTab = 
  | 'dashboard' 
  | 'record' 
  | 'records_list' 
  | 'students' 
  | 'classes' 
  | 'departments' 
  | 'users' 
  | 'analytics' 
  | 'leaderboard' 
  | 'coaching' 
  | 'reports' 
  | 'audit' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const { currentUser } = useApp();

  // Role permissions for menus
  const isMenuAllowed = (tab: NavTab, role: UserRole): boolean => {
    switch (tab) {
      case 'dashboard':
      case 'records_list':
      case 'analytics':
      case 'leaderboard':
      case 'reports':
        return true; // All 5 roles can view with scoped data
      case 'record':
        return role === 'admin' || role === 'tim_kesiswaan';
      case 'coaching':
        return role === 'admin' || role === 'tim_kesiswaan' || role === 'wali_kelas' || role === 'kkk';
      case 'students':
      case 'classes':
      case 'departments':
        return role === 'admin' || role === 'tim_kesiswaan' || role === 'kkk' || role === 'wali_kelas';
      case 'users':
      case 'audit':
        return role === 'admin';
      case 'settings':
        return role === 'admin' || role === 'kepala_sekolah' || role === 'tim_kesiswaan';
      default:
        return false;
    }
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType; badge?: string; highlight?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'record', label: 'Catat Keterlambatan', icon: Clock, badge: 'Pagi Hari', highlight: true },
    { id: 'records_list', label: 'Data Keterlambatan', icon: UserCheck },
    { id: 'analytics', label: 'Analisis & Grafik', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard Disiplin', icon: Trophy, badge: 'Zero Late' },
    { id: 'coaching', label: 'Tracing & Pembinaan', icon: HeartHandshake },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'classes', label: 'Data Kelas', icon: School },
    { id: 'departments', label: 'Kompetensi Keahlian', icon: Building2 },
    { id: 'reports', label: 'Laporan & Ekspor', icon: FileText },
    { id: 'users', label: 'Data Pengguna & RBAC', icon: UserCog },
    { id: 'audit', label: 'Audit Log Aktivitas', icon: ShieldCheck },
    { id: 'settings', label: 'Pengaturan & Supabase', icon: Settings },
  ];

  const filteredItems = navItems.filter(item => isMenuAllowed(item.id, currentUser.role));

  const handleSelect = (tab: NavTab) => {
    setCurrentTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B1528] text-slate-200 border-r border-slate-800 flex flex-col 
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 bg-[#091222]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md shadow-amber-500/10 flex-shrink-0 flex items-center justify-center border border-amber-400/30 overflow-hidden">
              <img 
                src="https://iili.io/nhMcBoB.md.png" 
                alt="Logo SMK Negeri 1 Jember" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to text if image fails
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = '<span class="font-black text-amber-500 text-xs">SMESA</span>';
                  }
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">PATROL SMESA</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">v1.0</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">SMK NEGERI 1 JEMBER</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/50">
            <p className="text-[10px] italic text-amber-300/80 tracking-wide">
              “Catat Cepat • Data Akurat • Pembinaan Tepat”
            </p>
          </div>
        </div>

        {/* User Scope Indicator */}
        <div className="px-4 py-3 bg-[#0d1a33] border-b border-slate-800/60 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Ruang Lingkup Hak Akses:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${
              currentUser.role === 'admin' ? 'bg-purple-400' :
              currentUser.role === 'kepala_sekolah' ? 'bg-blue-400' :
              currentUser.role === 'tim_kesiswaan' ? 'bg-emerald-400' :
              currentUser.role === 'kkk' ? 'bg-amber-400' : 'bg-cyan-400'
            }`} />
            <span className="font-semibold text-white truncate text-xs">
              {currentUser.role === 'admin' && 'Akses Penuh Administrator'}
              {currentUser.role === 'kepala_sekolah' && 'Monitoring Sekolah'}
              {currentUser.role === 'tim_kesiswaan' && 'Operasional Kesiswaan'}
              {currentUser.role === 'kkk' && 'Jurusan DKV (Ketua KKK)'}
              {currentUser.role === 'wali_kelas' && 'Kelas X DKV 1 (Wali Kelas)'}
            </span>
          </div>
        </div>

        {/* Nav Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Menu Navigasi
          </div>
          {filteredItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : item.highlight
                    ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive 
                      ? 'bg-blue-700 text-blue-100' 
                      : item.highlight 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {!item.badge && isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 bg-[#091222] text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-medium">SMK Negeri 1 Jember</span>
            <span className="text-amber-400 font-mono text-[10px]">WIB (UTC+7)</span>
          </div>
          <p className="text-[10px] text-slate-300 mt-0.5">Jawa Timur, Indonesia</p>
        </div>
      </aside>
    </>
  );
};
