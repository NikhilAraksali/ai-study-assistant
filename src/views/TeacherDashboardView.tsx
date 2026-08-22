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
  GraduationCap,
  Sparkles,
  FileText,
  Clock,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';

interface TeacherDashboardProps {
  onSelectClassroom: (classroomId: string) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardProps> = ({ onSelectClassroom }) => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create Classroom Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      const res = await api.getClassrooms();
      setClassrooms(res.classrooms || []);
    } catch (err: any) {
      console.error('Failed to load teacher classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter a classroom name');

    setCreateLoading(true);
    setError(null);
    try {
      await api.createClassroom({ name, description });
      setName('');
      setDescription('');
      setShowCreateModal(false);
      loadClassrooms();
    } catch (err: any) {
      setError(err.message || 'Failed to create classroom');
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalStudentsEnrolled = classrooms.reduce((acc, c) => acc + (c.studentCount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#71717A] font-medium font-mono">Loading teacher workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#161618] border border-[#242428] text-[11px] font-mono text-[#A1A1AA] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF]" />
            <span>Teacher Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            Instructor Hub 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
            Manage your courses, assignments, and AI-enabled study materials.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)] self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Classroom</span>
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: OVERVIEW HERO (Spans 3 cols on lg) */}
        <div className="md:col-span-2 lg:col-span-3 bento-card p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-[#5B8CFF]">
                COURSE OPERATIONS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F5F5]">
              Welcome back, {user?.name}
            </h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-xl">
              Distribute auto-generated 6-character codes to students, schedule assignments with strict deadlines, and upload PDF slide decks for automated AI tutor question-answering.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-[#242428] grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#161618] border border-[#242428]">
              <div className="text-[10px] font-mono text-[#71717A]">Active Classes</div>
              <div className="text-lg font-bold font-mono text-[#5B8CFF] mt-0.5">{classrooms.length}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#161618] border border-[#242428]">
              <div className="text-[10px] font-mono text-[#71717A]">Enrolled Students</div>
              <div className="text-lg font-bold font-mono text-[#65D6B0] mt-0.5">{totalStudentsEnrolled}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#161618] border border-[#242428] col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono text-[#71717A]">AI Engine</div>
              <div className="text-xs font-semibold text-[#F5F5F5] mt-1.5 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#65D6B0] mr-1.5" />
                Live Gemini 2.5
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: QUICK ACTION (1 col on lg) */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF] mb-3">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">
              Quick Create
            </h3>
            <p className="text-xs text-[#71717A] mt-1 leading-relaxed">
              Generate a new classroom with auto-issued 6-character code.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 w-full py-2 px-3 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] font-medium rounded-xl text-xs transition border border-[#242428] flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#5B8CFF]" />
            <span>Create Course</span>
          </button>
        </div>

        {/* CARD 3: CLASSROOMS GRID (Full Width) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-3.5 h-3.5 text-[#5B8CFF]" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                My Classrooms ({classrooms.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#71717A]">
              Click any classroom to manage topics, assignments, and students
            </span>
          </div>

          {classrooms.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717A] space-y-2">
              <p className="font-medium text-[#A1A1AA]">No classrooms created yet</p>
              <p className="text-[11px]">Click "New Classroom" above to set up your first active course.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map(c => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-[#161618] border border-[#242428] hover:border-[#383840] transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      {/* 6-char Student Code Pill with Copy */}
                      <button
                        onClick={() => copyToClipboard(c.code)}
                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#111113] border border-[#242428] text-[11px] font-mono font-bold text-[#5B8CFF] hover:border-[#5B8CFF]/50 transition"
                        title="Click to copy student code"
                      >
                        <span>{c.code}</span>
                        {copiedCode === c.code ? (
                          <Check className="w-3 h-3 text-[#65D6B0]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#71717A]" />
                        )}
                      </button>

                      <div className="flex items-center space-x-1 text-[11px] font-mono text-[#71717A]">
                        <Users className="w-3 h-3" />
                        <span>{c.studentCount || 0} enrolled</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-[#F5F5F5] mt-3 group-hover:text-[#5B8CFF] transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-[#71717A] mt-1 line-clamp-2 leading-relaxed">
                      {c.description || 'No course syllabus provided.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#242428] flex items-center justify-between">
                    <button
                      onClick={() => onSelectClassroom(c.id)}
                      className="text-xs font-semibold text-[#5B8CFF] hover:text-[#4879EB] flex items-center space-x-1 transition"
                    >
                      <span>Manage Classroom</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <span className="text-[10px] font-mono text-[#71717A]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#242428] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242428] pb-3">
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-[#5B8CFF]" />
                <span>Create New Classroom</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-[#F47C7C]/10 border border-[#F47C7C]/20 text-[#F47C7C] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateClassroom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Classroom Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Database Systems (CS402)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Description / Topic Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the course syllabus, lecture hours, or exam requirements..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/60 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:bg-[#161618] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !name.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#5B8CFF] hover:bg-[#4879EB] text-white transition disabled:opacity-40"
                >
                  {createLoading ? 'Generating Classroom...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
