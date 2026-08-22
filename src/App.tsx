import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AuthView } from './views/AuthView';
import { StudentDashboardView } from './views/StudentDashboardView';
import { TeacherDashboardView } from './views/TeacherDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { ClassroomsView } from './views/ClassroomsView';
import { ClassroomDetailView } from './views/ClassroomDetailView';
import { AiTutorView } from './views/AiTutorView';
import { AiQuizView } from './views/AiQuizView';
import { AiFlashcardsView } from './views/AiFlashcardsView';
import { AiStudyMaterialView } from './views/AiStudyMaterialView';
import { StudentProgressView } from './views/StudentProgressView';
import { AppNotification } from './types';
import { api } from './services/api';

const MainLayout: React.FC = () => {
  const { user, loading, isStudent, isTeacher, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Failed fetching notifications:', err);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed marking notification read:', err);
    }
  };

  const handleViewChange = (view: string) => {
    if (view !== 'classroom-detail') {
      setSelectedClassroomId(null);
    }
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#71717A] font-mono tracking-wide">
            Initializing ScholarAI Workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const handleSelectClassroom = (id: string) => {
    setSelectedClassroomId(id);
    setCurrentView('classroom-detail');
  };

  const renderView = () => {
    if (currentView === 'classroom-detail' && selectedClassroomId) {
      return (
        <ClassroomDetailView
          classroomId={selectedClassroomId}
          onBack={() => handleViewChange('classrooms')}
        />
      );
    }

    if (currentView === 'ai-suite' || currentView === 'ai-tutor') {
      return <AiTutorView />;
    }
    if (currentView === 'ai-quiz') {
      return <AiQuizView />;
    }
    if (currentView === 'ai-flashcards') {
      return <AiFlashcardsView />;
    }
    if (currentView === 'ai-material') {
      return <AiStudyMaterialView />;
    }
    if (currentView === 'progress') {
      return <StudentProgressView />;
    }
    if (currentView === 'admin' && isAdmin) {
      return <AdminDashboardView />;
    }

    if (currentView === 'classrooms') {
      return <ClassroomsView onSelectClassroom={handleSelectClassroom} />;
    }

    // Default Dashboard Routing based on User Role
    if (isAdmin) {
      return <AdminDashboardView />;
    }
    if (isTeacher) {
      return <TeacherDashboardView onSelectClassroom={handleSelectClassroom} />;
    }
    return (
      <StudentDashboardView
        onSelectClassroom={handleSelectClassroom}
        onLaunchAiTool={tool => handleViewChange(tool)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-row font-sans selection:bg-[#5B8CFF]/30 selection:text-[#F5F5F5] antialiased">
      {/* Desktop Left Bento Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={handleViewChange}
        unreadNotifsCount={notifications.filter(n => !n.isRead).length}
      />

      {/* Main Content Area with TopBar */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        <TopBar
          currentView={currentView}
          setCurrentView={handleViewChange}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-12">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
