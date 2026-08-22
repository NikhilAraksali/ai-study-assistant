import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Classroom, Assignment, Topic, StudentProgress } from '../types';
import {
  BookOpen,
  Plus,
  Clock,
  Sparkles,
  Layers,
  BrainCircuit,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  Lock,
  Compass
} from 'lucide-react';

interface StudentDashboardProps {
  onSelectClassroom: (classroomId: string) => void;
  onLaunchAiTool: (tool: string) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardProps> = ({
  onSelectClassroom,
  onLaunchAiTool
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [recentTopics, setRecentTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  // Join Classroom State
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentDashboard();
      setClassrooms(data.joinedClassrooms || []);
      setUpcomingAssignments(data.upcomingAssignments || []);
      setRecentTopics(data.recentTopics || []);
      setProgress(data.progress || null);
    } catch (err: any) {
      console.error('Failed loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await api.joinClassroom(joinCode.trim());
      setJoinSuccess(`Joined "${res.classroom.name}" successfully!`);
      setJoinCode('');
      loadDashboard();
    } catch (err: any) {
      setJoinError(err.message || 'Invalid classroom code');
    } finally {
      setJoinLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#71717A] font-medium font-mono">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const hasActivity =
    progress &&
    (progress.quizzesTaken > 0 ||
      progress.completedAssignments > 0 ||
      progress.totalAiInteractions > 0 ||
      progress.flashcardsMastered > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#161618] border border-[#242428] text-[11px] font-mono text-[#A1A1AA] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF]" />
            <span>Student Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            {greeting} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
            Keep learning. Keep building.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-[#71717A] px-2.5 py-1 rounded-lg bg-[#111113] border border-[#242428]">
            {classrooms.length} Active {classrooms.length === 1 ? 'Class' : 'Classes'}
          </span>
          <span className="text-[11px] font-mono text-[#71717A] px-2.5 py-1 rounded-lg bg-[#111113] border border-[#242428]">
            {upcomingAssignments.length} Pending
          </span>
        </div>
      </div>

      {/* Asymmetric Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
        {/* CARD 1: HERO AI TUTOR (Large Bento Card - spans 2 cols) */}
        <div className="md:col-span-2 bento-card-hero p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle technical background grid mark */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-radial from-[#5B8CFF]/10 to-transparent pointer-events-none opacity-60" />

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#5B8CFF] animate-pulse" />
                <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-[#5B8CFF]">
                  AI TUTOR
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#71717A] px-2 py-0.5 rounded bg-[#161618] border border-[#242428]">
                Gemini 2.5 Pro
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F5F5] max-w-md">
              Ask questions, understand concepts, and learn faster.
            </h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-md">
              Instant explanations, step-by-step guidance, code debugging, and concept breakdowns available around the clock.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#242428] flex items-center justify-between relative z-10">
            <button
              onClick={() => onLaunchAiTool('ai-tutor')}
              className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white text-xs font-semibold rounded-xl transition-all flex items-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)] group-hover:shadow-[0_4px_16px_rgba(91,140,255,0.4)]"
            >
              <span>Open AI Chat</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] font-mono text-[#71717A] hidden sm:inline">
              Prompt · Solve · Review
            </span>
          </div>
        </div>

        {/* CARD 2: PROGRESS BENTO (Medium Card - spans 1 col or 2 on tablet) */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                PROGRESS
              </span>
              <button
                onClick={() => onLaunchAiTool('progress')}
                className="text-[11px] text-[#5B8CFF] hover:underline flex items-center"
              >
                <span>Analytics</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            {!hasActivity ? (
              <div className="py-6 text-center text-xs text-[#71717A] space-y-1">
                <p className="font-medium text-[#A1A1AA]">No activity yet</p>
                <p className="text-[11px]">Start learning to see your progress here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-2xl font-bold font-mono text-[#F5F5F5]">
                      {progress?.avgQuizScore || 0}%
                    </span>
                    <span className="text-[11px] font-mono text-[#65D6B0]">
                      Quiz Avg Score
                    </span>
                  </div>
                  {/* Sleek Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#161618] overflow-hidden">
                    <div
                      className="h-full bg-[#5B8CFF] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, progress?.avgQuizScore || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#242428]">
                  <div className="p-2 rounded-lg bg-[#161618] border border-[#242428]">
                    <div className="text-[10px] text-[#71717A]">Submissions</div>
                    <div className="text-sm font-semibold font-mono text-[#F5F5F5] mt-0.5">
                      {progress?.completedAssignments || 0}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#161618] border border-[#242428]">
                    <div className="text-[10px] text-[#71717A]">AI Queries</div>
                    <div className="text-sm font-semibold font-mono text-[#F5F5F5] mt-0.5">
                      {progress?.totalAiInteractions || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 text-[10px] font-mono text-[#71717A] flex items-center justify-between">
            <span>Database Sync</span>
            <span className="text-[#65D6B0] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#65D6B0] mr-1" /> Live
            </span>
          </div>
        </div>

        {/* CARD 3: QUICK JOIN CLASSROOM (Compact Action Card) */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Compass className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Join Classroom
              </span>
            </div>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Enter the 6-character invitation code provided by your teacher.
            </p>
          </div>

          <div className="mt-4">
            {joinError && (
              <div className="mb-2 text-[11px] text-[#F47C7C] bg-[#F47C7C]/10 p-1.5 rounded-lg border border-[#F47C7C]/20">
                {joinError}
              </div>
            )}
            {joinSuccess && (
              <div className="mb-2 text-[11px] text-[#65D6B0] bg-[#65D6B0]/10 p-1.5 rounded-lg border border-[#65D6B0]/20">
                {joinSuccess}
              </div>
            )}

            <form onSubmit={handleJoinClassroom} className="space-y-2">
              <input
                type="text"
                placeholder="e.g. PYT72K"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-[#161618] text-[#F5F5F5] placeholder-[#71717A] rounded-xl text-xs uppercase font-mono border border-[#242428] focus:outline-none focus:border-[#5B8CFF]/60 text-center tracking-wider"
              />
              <button
                type="submit"
                disabled={joinLoading || !joinCode.trim()}
                className="w-full py-2 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] hover:text-white font-semibold rounded-xl text-xs transition border border-[#242428] disabled:opacity-40"
              >
                {joinLoading ? 'Joining...' : 'Join with Code'}
              </button>
            </form>
          </div>
        </div>

        {/* CARD 4: CURRENT CLASSROOMS (Large Bento Card - spans 2 cols) */}
        <div className="md:col-span-2 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-3.5 h-3.5 text-[#5B8CFF]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Current Classrooms ({classrooms.length})
                </span>
              </div>
            </div>

            {classrooms.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A] space-y-1">
                <p className="font-medium text-[#A1A1AA]">No classrooms yet</p>
                <p className="text-[11px]">Use the invite code box to join your first class.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classrooms.slice(0, 4).map(c => (
                  <div
                    key={c.id}
                    onClick={() => onSelectClassroom(c.id)}
                    className="p-3.5 rounded-xl bg-[#161618] border border-[#242428] hover:border-[#383840] transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#111113] border border-[#242428] text-[#5B8CFF]">
                          {c.code}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#71717A] group-hover:text-[#5B8CFF] group-hover:translate-x-0.5 transition" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold text-[#F5F5F5] mt-2 line-clamp-1 group-hover:text-[#5B8CFF] transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-[11px] text-[#71717A] mt-0.5 truncate">
                        {c.teacherName}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#242428] text-[10px] font-mono text-[#71717A]">
                      View Materials & Tasks →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARD 5: UPCOMING ASSIGNMENTS (Medium Card - spans 2 cols) */}
        <div className="md:col-span-2 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-[#F2B866]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Upcoming Assignments
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161618] border border-[#242428] text-[#71717A]">
                {upcomingAssignments.length} pending
              </span>
            </div>

            {upcomingAssignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A] space-y-1">
                <p className="font-medium text-[#A1A1AA]">All caught up!</p>
                <p className="text-[11px]">No pending assignments scheduled right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingAssignments.slice(0, 3).map(a => {
                  const isUpcoming = a.status === 'upcoming';
                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelectClassroom(a.classroomId)}
                      className="p-3 rounded-xl bg-[#161618] border border-[#242428] hover:border-[#383840] transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                              isUpcoming
                                ? 'bg-[#F2B866]/10 text-[#F2B866] border border-[#F2B866]/20'
                                : 'bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/20'
                            }`}
                          >
                            {isUpcoming ? 'Opens Soon' : 'Active'}
                          </span>
                          <span className="text-[10px] text-[#71717A] truncate font-mono">
                            {a.classroomName || 'Classroom'}
                          </span>
                        </div>
                        <h4 className="text-xs font-medium text-[#F5F5F5] mt-1 truncate group-hover:text-[#5B8CFF] transition-colors">
                          {a.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-mono text-[#71717A]">
                          Due {new Date(a.dueAt).toLocaleDateString()}
                        </div>
                        <span className="text-[11px] font-medium text-[#5B8CFF] flex items-center justify-end mt-0.5">
                          Submit <ArrowRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CARD 6: FLASHCARDS BENTO TILE (1 col) */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-[#161618] border border-[#242428] flex items-center justify-center text-[#8B7CFF] mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">
              Flashcards
            </h3>
            <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
              Convert topics into flipcards for high-retention spaced revision.
            </p>
          </div>

          <button
            onClick={() => onLaunchAiTool('ai-flashcards')}
            className="mt-4 w-full py-2 px-3 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] hover:text-white font-medium rounded-xl text-xs transition border border-[#242428] text-center"
          >
            Study Cards →
          </button>
        </div>

        {/* CARD 7: QUIZ PERFORMANCE BENTO TILE (1 col) */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-[#161618] border border-[#242428] flex items-center justify-center text-[#65D6B0] mb-3">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                Practice Quiz
              </h3>
              {progress && progress.avgQuizScore > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/20">
                  {progress.avgQuizScore}% Avg
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
              Generate timed practice assessments with instant feedback.
            </p>
          </div>

          <button
            onClick={() => onLaunchAiTool('ai-quiz')}
            className="mt-4 w-full py-2 px-3 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] hover:text-white font-medium rounded-xl text-xs transition border border-[#242428] text-center"
          >
            Take Quiz →
          </button>
        </div>

        {/* CARD 8: RECENT ACTIVITY / NOTES BENTO (Full Width on 4 cols) */}
        {recentTopics.length > 0 && (
          <div className="md:col-span-2 xl:col-span-4 bento-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#5B8CFF]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Recent Classroom Notes & Materials
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentTopics.slice(0, 3).map(topic => (
                <div
                  key={topic.id}
                  onClick={() => onSelectClassroom(topic.classroomId)}
                  className="p-3.5 rounded-xl bg-[#161618] border border-[#242428] hover:border-[#383840] transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                      <span className="text-[#5B8CFF]">{topic.teacherName}</span>
                      <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#F5F5F5] mt-1.5 line-clamp-1 group-hover:text-[#5B8CFF] transition-colors">
                      {topic.title}
                    </h4>
                    <p className="text-xs text-[#71717A] mt-1 line-clamp-2 leading-relaxed">
                      {topic.content}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#242428] flex items-center justify-between text-[10px] text-[#A1A1AA] font-mono">
                    <span>{topic.pdfFileName ? '📄 PDF Included' : 'Class Note'}</span>
                    <ChevronRight className="w-3 h-3 text-[#71717A] group-hover:text-[#5B8CFF] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
