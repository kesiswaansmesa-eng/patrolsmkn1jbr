import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
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
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        />

        {/* Dynamic View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
