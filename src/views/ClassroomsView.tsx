import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Classroom } from '../types';
import {
  BookOpen,
  Plus,
  Users,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Search,
  School,
  X,
  Layers,
  GraduationCap,
  KeyRound
} from 'lucide-react';

interface ClassroomsViewProps {
  onSelectClassroom: (classroomId: string) => void;
}

export const ClassroomsView: React.FC<ClassroomsViewProps> = ({ onSelectClassroom }) => {
  const { user, isTeacher, isStudent } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Teacher: Create Classroom Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Student: Join Classroom State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const res = await api.getClassrooms();
        setClassrooms(res.classrooms || []);
      } else {
        const res = await api.getStudentDashboard();
        setClassrooms(res.joinedClassrooms || []);
      }
    } catch (err: any) {
      console.error('Failed to load classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, [isTeacher, isStudent]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      return setCreateError('Please enter a classroom name');
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.createClassroom({
        name: newClassName.trim(),
        description: newClassDescription.trim()
      });
      setNewClassName('');
      setNewClassDescription('');
      setShowCreateModal(false);
      loadClassrooms();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create classroom');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await api.joinClassroom(joinCode.trim().toUpperCase());
      setJoinSuccess(`Successfully joined "${res.classroom.name}"!`);
      setJoinCode('');
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinSuccess(null);
        loadClassrooms();
      }, 1200);
    } catch (err: any) {
      setJoinError(err.message || 'Invalid or expired classroom code');
    } finally {
      setJoinLoading(false);
    }
  };

  const copyToClipboard = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredClassrooms = classrooms.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.teacherName && c.teacherName.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#71717A] font-medium font-mono">Loading classrooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#161618] border border-[#242428] text-[11px] font-mono text-[#A1A1AA] mb-2">
            <BookOpen className="w-3 h-3 text-[#5B8CFF]" />
            <span>{isTeacher ? 'Instructor Hub' : 'Enrolled Courses'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            Classrooms
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
            {isTeacher
              ? 'Manage your active classes, share join codes with students, and upload materials.'
              : 'Access your joined classes, view scheduled assignments, and explore course notes.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {isTeacher ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Classroom</span>
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
            >
              <KeyRound className="w-4 h-4" />
              <span>Join with Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111113] p-3 rounded-2xl border border-[#242428]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            placeholder="Search by class name, course code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/50 transition"
          />
        </div>

        <div className="text-xs text-[#71717A] font-mono self-end sm:self-center">
          Showing {filteredClassrooms.length} of {classrooms.length} {classrooms.length === 1 ? 'Classroom' : 'Classrooms'}
        </div>
      </div>

      {/* Classrooms Grid */}
      {filteredClassrooms.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#111113] border border-[#242428] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#161618] border border-[#242428] flex items-center justify-center mx-auto text-[#71717A]">
            <School className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">
              {searchQuery ? 'No matching classrooms found' : isTeacher ? 'No classrooms created yet' : 'No classrooms joined yet'}
            </h3>
            <p className="text-xs text-[#71717A] leading-relaxed">
              {searchQuery
                ? `No classrooms matching "${searchQuery}". Try clearing your search.`
                : isTeacher
                ? 'Create your first classroom to generate join codes and start posting assignments and AI study materials.'
                : 'Ask your instructor for their 6-character classroom code and click "Join with Code" to get started.'}
            </p>
          </div>
          {!searchQuery && (
            <div>
              {isTeacher ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Classroom</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition inline-flex items-center space-x-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Join Classroom Now</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassrooms.map(classroom => (
            <div
              key={classroom.id}
              onClick={() => onSelectClassroom(classroom.id)}
              className="bento-card p-5 flex flex-col justify-between hover:border-[#5B8CFF]/50 transition-all duration-200 cursor-pointer group relative overflow-hidden"
            >
              {/* Subtle accent corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-radial from-[#5B8CFF]/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="space-y-3 relative z-10">
                {/* Header Badge & Code */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#161618] border border-[#242428] text-[10px] font-mono text-[#A1A1AA]">
                    <School className="w-3 h-3 text-[#5B8CFF]" />
                    <span>Classroom</span>
                  </div>

                  <button
                    onClick={e => copyToClipboard(classroom.code, e)}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#161618] border border-[#242428] text-[10px] font-mono text-[#5B8CFF] hover:border-[#5B8CFF]/50 transition"
                    title="Click to copy join code"
                  >
                    {copiedCode === classroom.code ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-[#65D6B0]" />
                        <span className="text-[#65D6B0]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-2.5 h-2.5" />
                        <span>{classroom.code}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-semibold text-[#F5F5F5] group-hover:text-[#5B8CFF] transition-colors line-clamp-1">
                    {classroom.name}
                  </h3>
                  <p className="text-xs text-[#71717A] line-clamp-2 mt-1 leading-relaxed">
                    {classroom.description || 'Interactive course workspace with scheduled assignments and AI study assistance.'}
                  </p>
                </div>
              </div>

              {/* Footer Meta & Action */}
              <div className="mt-5 pt-3.5 border-t border-[#242428] flex items-center justify-between relative z-10 text-xs">
                <div className="flex items-center space-x-3 text-[#71717A]">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{classroom.studentCount || 0} students</span>
                  </div>
                  {classroom.teacherName && (
                    <div className="hidden sm:flex items-center space-x-1 text-[#A1A1AA]">
                      <GraduationCap className="w-3.5 h-3.5 text-[#65D6B0]" />
                      <span className="truncate max-w-[90px]">{classroom.teacherName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 text-[#5B8CFF] font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                  <span>Enter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEACHER: CREATE CLASSROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#111113] border border-[#242428] rounded-2xl p-6 shadow-2xl text-[#F5F5F5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#242428]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center text-[#5B8CFF]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Create New Classroom</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#161618] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="mt-4 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {createError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A1A1AA]">Classroom Name</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Python Programming"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A1A1AA]">Description (Optional)</label>
                <textarea
                  placeholder="e.g. Fall Semester 2026 course covering algorithms and data structures..."
                  value={newClassDescription}
                  onChange={e => setNewClassDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] transition resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {createLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT: JOIN CLASSROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#111113] border border-[#242428] rounded-2xl p-6 shadow-2xl text-[#F5F5F5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#242428]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center text-[#5B8CFF]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Join a Classroom</h3>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#161618] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinClassroom} className="mt-4 space-y-4">
              {joinError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {joinError}
                </div>
              )}
              {joinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{joinSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A1A1AA]">6-Character Classroom Code</label>
                <input
                  type="text"
                  placeholder="e.g. PY101 or AI202"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full px-3 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-base font-mono tracking-wider uppercase text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] transition"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-[#71717A]">
                  Enter the code provided by your instructor or teacher.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#161618] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !joinCode.trim()}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {joinLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>Join Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
