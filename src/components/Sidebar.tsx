import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  Layers,
  BrainCircuit,
  BarChart3,
  LogOut,
  ShieldAlert,
  FileText
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  unreadNotifsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  unreadNotifsCount
}) => {
  const { user, logout, isStudent, isTeacher, isAdmin } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['student', 'teacher', 'admin']
    },
    {
      id: 'classrooms',
      label: 'Classrooms',
      icon: BookOpen,
      roles: ['student', 'teacher']
    },
    {
      id: 'ai-tutor',
      label: 'AI Chat',
      icon: Bot,
      roles: ['student', 'teacher'],
      badge: 'AI'
    },
    {
      id: 'ai-flashcards',
      label: 'Flashcards',
      icon: Layers,
      roles: ['student']
    },
    {
      id: 'ai-quiz',
      label: 'Quizzes',
      icon: BrainCircuit,
      roles: ['student']
    },
    {
      id: 'ai-material',
      label: 'PDF Synthesizer',
      icon: FileText,
      roles: ['student']
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: BarChart3,
      roles: ['student']
    },
    {
      id: 'admin',
      label: 'Admin Area',
      icon: ShieldAlert,
      roles: ['admin']
    }
  ];

  const visibleNav = navItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 bg-[#050505] border-r border-[#242428] z-30 select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#242428]/60 shrink-0">
        <div
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-[#111113] border border-[#242428] flex items-center justify-center text-[#5B8CFF] font-mono font-bold text-sm group-hover:border-[#5B8CFF]/50 transition-colors">
            Σ
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-sm tracking-tight text-[#F5F5F5]">
              ScholarAI
            </span>
            <span className="text-[10px] font-mono text-[#71717A] px-1.5 py-0.5 rounded bg-[#111113] border border-[#242428]">
              v2.5
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          Platform
        </div>

        {visibleNav.map(item => {
          const Icon = item.icon;
          const isActive =
            currentView === item.id ||
            (item.id === 'ai-tutor' && currentView === 'ai-suite') ||
            (item.id === 'classrooms' && currentView === 'classroom-detail');

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group relative whitespace-nowrap ${
                isActive
                  ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#111113] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {isActive && (
                  <span className="absolute left-0 w-1 h-4 bg-[#5B8CFF] rounded-r-full shadow-[0_0_8px_rgba(91,140,255,0.6)]" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#5B8CFF]' : 'text-[#71717A] group-hover:text-[#A1A1AA]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/20 shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions / Secondary Nav */}
      <div className="p-3 border-t border-[#242428]/60 space-y-1 shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#F47C7C]/80 hover:text-[#F47C7C] hover:bg-[#F47C7C]/10 transition border border-transparent"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

