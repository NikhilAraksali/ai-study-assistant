import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import {
  Bell,
  Check,
  MessageSquare,
  LogOut,
  Sparkles,
  BookOpen,
  Layers,
  BrainCircuit,
  BarChart3,
  ShieldAlert,
  Menu,
  X,
  FileText
} from 'lucide-react';

interface TopBarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  setCurrentView,
  notifications,
  onMarkNotificationRead
}) => {
  const { user, logout, isStudent, isTeacher, isAdmin } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'classrooms':
        return 'Classrooms';
      case 'classroom-detail':
        return 'Classroom Workspace';
      case 'ai-tutor':
      case 'ai-suite':
        return 'AI Study Tutor';
      case 'ai-flashcards':
        return 'Flashcard Deck';
      case 'ai-quiz':
        return 'AI Practice Quiz';
      case 'ai-material':
        return 'PDF Study Material';
      case 'progress':
        return 'Learning Analytics';
      case 'admin':
        return 'Administration Area';
      default:
        return 'Workspace';
    }
  };

  const closeAllMenus = () => {
    setNotifOpen(false);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-16 sticky top-0 z-30 bg-[#050505]/95 backdrop-blur border-b border-[#242428] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
        {/* Left: Breadcrumbs & Mobile Menu Trigger */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setNotifOpen(false);
              setProfileOpen(false);
            }}
            className="lg:hidden p-2 rounded-xl bg-[#111113] border border-[#242428] text-[#A1A1AA] hover:text-[#F5F5F5] transition shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Mobile Brand Logo */}
          <div
            onClick={() => {
              setCurrentView('dashboard');
              closeAllMenus();
            }}
            className="lg:hidden flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <div className="w-6 h-6 rounded-md bg-[#111113] border border-[#242428] flex items-center justify-center text-[#5B8CFF] font-mono font-bold text-xs">
              Σ
            </div>
            <span className="font-semibold text-xs tracking-tight text-[#F5F5F5]">ScholarAI</span>
          </div>

          {/* Desktop Breadcrumb Navigation */}
          <div className="hidden lg:flex items-center space-x-2 text-xs truncate">
            <span className="text-[#71717A]">Workspace</span>
            <span className="text-[#242428]">/</span>
            <span className="font-medium text-[#F5F5F5] truncate">{getViewTitle()}</span>
          </div>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className={`p-2 rounded-xl bg-[#111113] border transition relative ${
                notifOpen ? 'border-[#5B8CFF] text-[#F5F5F5]' : 'border-[#242428] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#383840]'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#5B8CFF] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(91,140,255,0.6)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Click-outside backdrop for Notifications */}
            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setNotifOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-[#111113] border border-[#242428] shadow-2xl py-3 z-50 text-[#F5F5F5] animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 pb-2 border-b border-[#242428] flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#F5F5F5]">Notifications</span>
                    <span className="text-[10px] text-[#71717A] font-mono">{notifications.length} total</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-[#242428]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#71717A]">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs space-y-1 transition ${
                            n.isRead ? 'opacity-50' : 'bg-[#161618] font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#F5F5F5] text-xs">{n.title}</span>
                            {!n.isRead && (
                              <button
                                onClick={() => onMarkNotificationRead(n.id)}
                                className="text-[10px] text-[#5B8CFF] hover:underline flex items-center space-x-0.5 font-mono"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[#A1A1AA] text-[11px] leading-relaxed">{n.message}</p>
                          <p className="text-[9px] text-[#71717A] font-mono">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile Trigger */}
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className={`flex items-center space-x-2 p-1.5 rounded-xl bg-[#111113] border transition ${
                  profileOpen ? 'border-[#5B8CFF]' : 'border-[#242428] hover:border-[#383840]'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-[#161618] border border-[#242428] flex items-center justify-center font-bold text-xs text-[#5B8CFF] uppercase shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <div className="text-xs font-semibold text-[#F5F5F5] leading-none truncate max-w-[100px]">{user.name}</div>
                  <div className="text-[10px] text-[#71717A] capitalize mt-0.5">{user.role}</div>
                </div>
              </button>

              {/* Click-outside backdrop for Profile */}
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#111113] border border-[#242428] shadow-2xl py-2 z-50 text-xs text-[#F5F5F5] animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-[#242428]">
                      <p className="font-semibold text-[#F5F5F5] truncate">{user.name}</p>
                      <p className="text-[11px] text-[#71717A] truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center space-x-1.5">
                        <span className="text-[10px] capitalize font-medium px-2 py-0.5 rounded-full bg-[#161618] text-[#5B8CFF] border border-[#242428]">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          setCurrentView('dashboard');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center space-x-2 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#71717A]" />
                        <span>Dashboard</span>
                      </button>

                      {isStudent && (
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            setCurrentView('progress');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center space-x-2 transition"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-[#71717A]" />
                          <span>My Progress</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            setCurrentView('admin');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center space-x-2 transition"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#5B8CFF]" />
                          <span>Admin Area</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-[#242428] pt-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#F47C7C]/10 text-[#F47C7C] flex items-center space-x-2 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Slide-Out Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0E0E10] border-r border-[#242428] z-50 flex flex-col p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#242428] pb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#111113] border border-[#242428] flex items-center justify-center text-[#5B8CFF] font-mono font-bold text-sm">
                  Σ
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm text-[#F5F5F5]">ScholarAI</span>
                  <span className="text-[9px] font-mono text-[#71717A] px-1.5 py-0.5 rounded bg-[#161618] border border-[#242428]">
                    v2.5
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-[#161618] text-[#71717A] hover:text-[#F5F5F5] border border-[#242428]"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-1.5 py-4">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                Navigation
              </div>

              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  currentView === 'dashboard'
                    ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                    : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#5B8CFF]" />
                <span>Dashboard</span>
              </button>

              {(isStudent || isTeacher) && (
                <button
                  onClick={() => {
                    setCurrentView('classrooms');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    currentView === 'classrooms' || currentView === 'classroom-detail'
                      ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#65D6B0]" />
                  <span>Classrooms</span>
                </button>
              )}

              {isStudent && (
                <>
                  <button
                    onClick={() => {
                      setCurrentView('ai-tutor');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      currentView === 'ai-tutor' || currentView === 'ai-suite'
                        ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-[#5B8CFF]" />
                    <span>AI Study Tutor</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('ai-flashcards');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      currentView === 'ai-flashcards'
                        ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#8B7CFF]" />
                    <span>Flashcards Deck</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('ai-quiz');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      currentView === 'ai-quiz'
                        ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4 text-[#65D6B0]" />
                    <span>Practice Quizzes</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('ai-material');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      currentView === 'ai-material'
                        ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-[#F2B866]" />
                    <span>PDF Synthesizer</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('progress');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      currentView === 'progress'
                        ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-[#F2B866]" />
                    <span>Progress Analytics</span>
                  </button>
                </>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    setCurrentView('admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    currentView === 'admin'
                      ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428]'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618]'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-[#5B8CFF]" />
                  <span>Admin Panel</span>
                </button>
              )}
            </div>

            <div className="border-t border-[#242428] pt-3 shrink-0">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-[#F47C7C]/10 hover:bg-[#F47C7C]/20 border border-[#F47C7C]/20 text-xs font-semibold text-[#F47C7C] transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

