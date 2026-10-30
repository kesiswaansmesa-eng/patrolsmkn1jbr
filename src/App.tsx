import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { RecordLatenessView } from './components/record/RecordLatenessView';
import { LatenessRecordsView } from './components/records/LatenessRecordsView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { CoachingView } from './components/coaching/CoachingView';
import { StudentsView } from './components/master/StudentsView';
import { ClassesView } from './components/master/ClassesView';
import { DepartmentsView } from './components/master/DepartmentsView';
import { UsersView } from './components/master/UsersView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { SettingsView } from './components/settings/SettingsView';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, currentUser } = useApp();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Proteksi: Menu Pengaturan hanya ada dan aktif untuk akun Administrator saja
  useEffect(() => {
    if (currentTab === 'settings' && currentUser.role !== 'admin') {
      setCurrentTab('dashboard');
    }
  }, [currentUser.role, currentTab]);

  // If user is not authenticated, show the Login View directly
  if (!isAuthenticated) {
    return (
      <LoginView 
        onSuccessLogin={() => setCurrentTab('dashboard')} 
      />
    );
  }

  // If user explicitly navigated to the login view, show it with option to return or switch account
  if (currentTab === 'login') {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-xl backdrop-blur-md flex items-center gap-2 cursor-pointer"
          >
            <span>← Kembali ke Dashboard</span>
          </button>
        </div>
        <LoginView 
          onSuccessLogin={() => setCurrentTab('dashboard')} 
        />
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView 
            onNavigateToRecord={() => setCurrentTab('record')}
            onNavigateToRecordsList={() => setCurrentTab('records_list')}
            onNavigateToLeaderboard={() => setCurrentTab('leaderboard')}
            onNavigateToCoaching={() => setCurrentTab('coaching')}
          />
        );
      case 'record':
        return <RecordLatenessView />;
      case 'records_list':
        return <LatenessRecordsView />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'coaching':
        return <CoachingView />;
      case 'students':
        return <StudentsView />;
      case 'classes':
        return <ClassesView />;
      case 'departments':
        return <DepartmentsView />;
      case 'users':
        return <UsersView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogView />;
      case 'settings':
        if (currentUser.role !== 'admin') {
          return (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Terbatas: Administrator</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Menu Pengaturan Sistem hanya dapat diakses dan dikelola oleh akun <strong>Administrator</strong>. Silakan beralih ke akun Administrator melalui menu profil jika Anda berwenang mengatur konfigurasi.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </div>
          );
        }
        return <SettingsView />;
      default:
        return (
          <DashboardView 
            onNavigateToRecord={() => setCurrentTab('record')}
            onNavigateToRecordsList={() => setCurrentTab('records_list')}
            onNavigateToLeaderboard={() => setCurrentTab('leaderboard')}
            onNavigateToCoaching={() => setCurrentTab('coaching')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isOpenMobile={isMobileMenuOpen}
        setIsOpenMobile={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        {/* Top Navbar */}
        <Header 
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          onOpenSettings={() => setCurrentTab('settings')}
          onOpenLogin={() => setCurrentTab('login')}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary fallbackTitle="Halaman Ini Mengalami Kendala Tampilan">
            {renderCurrentView()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="PATROL SMESA Sedang Dipulihkan">
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
