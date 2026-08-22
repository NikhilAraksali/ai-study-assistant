import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Classroom, Topic, Assignment, AssignmentStatus, ClassroomMeeting } from '../types';
import { EmptyState } from '../components/EmptyState';
import { PdfAiStudyModal } from '../components/PdfAiStudyModal';
import { ClassroomMeetSection } from '../components/ClassroomMeetSection';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  Upload,
  Plus,
  Copy,
  Check,
  FileText,
  Sparkles,
  Send,
  CheckCircle2,
  Calendar,
  X,
  Paperclip,
  GraduationCap,
  ArrowRight,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Video
} from 'lucide-react';

interface ClassroomDetailViewProps {
  classroomId: string;
  onBack: () => void;
}

export const ClassroomDetailView: React.FC<ClassroomDetailViewProps> = ({
  classroomId,
  onBack
}) => {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [meetings, setMeetings] = useState<ClassroomMeeting[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // PDF Study Modal State
  const [activePdfTopic, setActivePdfTopic] = useState<Topic | null>(null);

  // Teacher Create Topic Modal State
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicContent, setTopicContent] = useState('');
  const [topicPdfFile, setTopicPdfFile] = useState<File | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Teacher Schedule Assignment Modal
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgAvailableAt, setAsgAvailableAt] = useState('');
  const [asgDueAt, setAsgDueAt] = useState('');
  const [asgPdfFile, setAsgPdfFile] = useState<File | null>(null);
  const [asgLoading, setAsgLoading] = useState(false);

  // Student Submit Assignment Modal
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [subContent, setSubContent] = useState('');
  const [subPdfFile, setSubPdfFile] = useState<File | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Teacher Review Submissions Drawer
  const [reviewAssignment, setReviewAssignment] = useState<Assignment | null>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cRes, tRes, aRes, mRes] = await Promise.all([
        api.getClassroom(classroomId),
        api.getTopics(classroomId),
        api.getAssignments(classroomId),
        api.getMeetings(classroomId).catch(() => ({ meetings: [] }))
      ]);
      setClassroom(cRes.classroom);
      setTopics(tRes.topics || []);
      setAssignments(aRes.assignments || []);
      setMeetings(mRes.meetings || []);

      if (isTeacher) {
        try {
          const sRes = await api.getClassroomStudents(classroomId);
          if (sRes.students) setStudents(sRes.students);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err: any) {
      console.error('Failed to load classroom:', err);
      setLoadError(err.message || 'Unable to connect to classroom. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const refreshMeetings = async () => {
    try {
      const res = await api.getMeetings(classroomId);
      setMeetings(res.meetings || []);
    } catch (err) {
      console.error('Failed to refresh meetings:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [classroomId]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() && !topicPdfFile && !topicContent.trim()) {
      return setTopicError('Please enter a title, content notes, or select a PDF document.');
    }

    setTopicLoading(true);
    setTopicError(null);
    try {
      let pdfBase64: string | undefined = undefined;
      let pdfFileName: string | undefined = undefined;

      if (topicPdfFile) {
        pdfFileName = topicPdfFile.name;
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = err => reject(err);
          reader.readAsDataURL(topicPdfFile);
        });
      }

      await api.createTopic(classroomId, {
        title: topicTitle.trim() || topicPdfFile?.name || 'Class Topic',
        content: topicContent.trim(),
        pdfBase64,
        pdfFileName
      });

      setTopicTitle('');
      setTopicContent('');
      setTopicPdfFile(null);
      setShowTopicModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Error creating topic:', err);
      setTopicError(err.message || 'Failed posting topic.');
    } finally {
      setTopicLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the topic "${title}"?`)) return;
    try {
      await api.deleteTopic(classroomId, topicId);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete topic: ' + err.message);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgDesc.trim() || !asgAvailableAt || !asgDueAt) {
      return alert('Please fill in all required assignment fields');
    }

    setAsgLoading(true);
    try {
      let pdfBase64: string | undefined = undefined;
      let pdfFileName: string | undefined = undefined;

      if (asgPdfFile) {
        pdfFileName = asgPdfFile.name;
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = err => reject(err);
          reader.readAsDataURL(asgPdfFile);
        });
      }

      await api.createAssignment(classroomId, {
        title: asgTitle,
        description: asgDesc,
        pdfBase64,
        pdfFileName,
        availableAt: asgAvailableAt,
        dueAt: asgDueAt
      });
      setAsgTitle('');
      setAsgDesc('');
      setAsgPdfFile(null);
      setAsgAvailableAt('');
      setAsgDueAt('');
      setShowAssignmentModal(false);
      loadData();
    } catch (err: any) {
      alert('Failed to schedule assignment: ' + err.message);
    } finally {
      setAsgLoading(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    if (!subContent.trim() && !subPdfFile) {
      return setSubError('Please enter written content or upload a PDF document');
    }

    setSubLoading(true);
    setSubError(null);
    try {
      let pdfBase64: string | undefined = undefined;
      let pdfFileName: string | undefined = undefined;

      if (subPdfFile) {
        pdfFileName = subPdfFile.name;
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = err => reject(err);
          reader.readAsDataURL(subPdfFile);
        });
      }

      await api.submitAssignment(submittingAssignment.id, {
        content: subContent,
        pdfBase64,
        pdfFileName
      });
      setSubmittingAssignment(null);
      setSubContent('');
      setSubPdfFile(null);
      loadData();
    } catch (err: any) {
      setSubError(err.message || 'Failed to submit assignment');
    } finally {
      setSubLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the classroom?')) return;
    try {
      await api.removeStudentFromClassroom(classroomId, studentId);
      loadData();
    } catch (err: any) {
      alert('Failed to remove student: ' + err.message);
    }
  };

  const handleOpenReviewSubmissions = async (asg: Assignment) => {
    setReviewAssignment(asg);
    setSubsLoading(true);
    try {
      const res = await api.getSubmissions(asg.id);
      setSubmissionsList(res.submissions || []);
    } catch (err: any) {
      alert('Failed loading submissions: ' + err.message);
    } finally {
      setSubsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#71717A] font-mono font-medium">Loading classroom workspace...</p>
        </div>
      </div>
    );
  }

  if (loadError || !classroom) {
    return (
      <div className="space-y-6 pb-12 max-w-xl mx-auto pt-10">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bento-card p-6 sm:p-8 text-center space-y-4 border border-[#F47C7C]/30 bg-[#161618]/80">
          <div className="w-12 h-12 rounded-2xl bg-[#F47C7C]/10 border border-[#F47C7C]/20 flex items-center justify-center mx-auto text-[#F47C7C]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F5F5F5]">Unable to Load Classroom</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
              {loadError || 'The requested classroom could not be found or you do not have permission to view it.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => loadData()}
              className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-[#161618] hover:bg-[#242428] text-[#A1A1AA] hover:text-[#F5F5F5] font-semibold rounded-xl text-xs transition border border-[#242428]"
            >
              Return to Classes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Classroom Bento Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Large Tile: Classroom Info & Actions */}
        <div className="md:col-span-2 lg:col-span-3 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-[#161618] border border-[#242428]">
                <span className="text-[11px] font-mono font-bold text-[#5B8CFF]">
                  Code: {classroom?.code}
                </span>
                <button
                  onClick={() => classroom && copyCode(classroom.code)}
                  className="text-[#71717A] hover:text-[#F5F5F5] transition"
                  title="Copy Classroom Code"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-[#65D6B0]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F5F5]">
              {classroom?.name}
            </h1>
            <p className="text-xs text-[#71717A] mt-1">
              Instructor: <span className="font-semibold text-[#A1A1AA]">{classroom?.teacherName}</span>
            </p>
            {classroom?.description && (
              <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed max-w-xl">
                {classroom.description}
              </p>
            )}
          </div>

          {/* Teacher Actions */}
          {isTeacher && (
            <div className="mt-5 pt-4 border-t border-[#242428] flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setTopicError(null);
                  setShowTopicModal(true);
                }}
                className="px-3.5 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post New Topic / Notes</span>
              </button>
              <button
                onClick={() => setShowAssignmentModal(true)}
                className="px-3.5 py-2 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 border border-[#242428]"
              >
                <Clock className="w-3.5 h-3.5 text-[#F2B866]" />
                <span>Schedule Assignment</span>
              </button>
            </div>
          )}
        </div>

        {/* Small Stat Tile: Quick Stats */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#71717A] mb-3">
              Overview
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA] flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5B8CFF]" />
                  <span>Topics & Materials</span>
                </span>
                <span className="text-xs font-bold font-mono text-[#F5F5F5]">{topics.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F2B866]" />
                  <span>Assignments</span>
                </span>
                <span className="text-xs font-bold font-mono text-[#F5F5F5]">{assignments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA] flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-[#65D6B0]" />
                  <span>Students</span>
                </span>
                <span className="text-xs font-bold font-mono text-[#F5F5F5]">
                  {isTeacher ? students.length : classroom?.studentCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA] flex items-center space-x-1.5">
                  <Video className="w-3.5 h-3.5 text-[#5B8CFF]" />
                  <span>Google Meet</span>
                </span>
                <span className="text-xs font-bold font-mono text-[#F5F5F5]">
                  {meetings.filter(m => m.status === 'active').length > 0 ? (
                    <span className="text-[#F47C7C] font-bold">Live</span>
                  ) : (
                    meetings.length
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#242428] text-[10px] font-mono text-[#71717A]">
            Created {classroom?.createdAt ? new Date(classroom.createdAt).toLocaleDateString() : 'Active'}
          </div>
        </div>

      </div>

      {/* Google Meet Live Sessions Section */}
      <ClassroomMeetSection
        classroomId={classroomId}
        classroomName={classroom?.name || 'Classroom'}
        isTeacher={isTeacher}
        meetings={meetings}
        onRefreshMeetings={refreshMeetings}
      />

      {/* Bento Grid: Topics & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Topics & Resources Bento Section */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#5B8CFF]" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Topics & Study Resources ({topics.length})
                </h2>
              </div>
              {isTeacher && (
                <button
                  onClick={() => {
                    setTopicError(null);
                    setShowTopicModal(true);
                  }}
                  className="text-xs font-semibold text-[#5B8CFF] hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Topic</span>
                </button>
              )}
            </div>

            {topics.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A]">
                No topics posted yet. {isTeacher ? 'Post study notes, announcements, or materials for your students.' : 'Your instructor will post course materials here.'}
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map(t => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-[#161618] border border-[#242428] space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                      <span className="font-semibold text-[#5B8CFF]">{t.teacherName}</span>
                      <div className="flex items-center space-x-2">
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        {isTeacher && (
                          <button
                            onClick={() => handleDeleteTopic(t.id, t.title)}
                            className="text-[#71717A] hover:text-[#F47C7C] transition p-0.5 rounded"
                            title="Delete topic"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-[#F5F5F5] line-clamp-1">
                      {t.title}
                    </h4>

                    {t.content && (
                      <p className="text-xs text-[#A1A1AA] line-clamp-3 leading-relaxed whitespace-pre-line">
                        {t.content}
                      </p>
                    )}

                    <div className="pt-2.5 border-t border-[#242428] flex items-center justify-between">
                      {t.attachmentUrl ? (
                        <a
                          href={t.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#5B8CFF] hover:underline font-mono truncate max-w-[150px] flex items-center space-x-1"
                        >
                          <Paperclip className="w-3 h-3 flex-shrink-0" />
                          <span>{t.attachmentName || t.pdfFileName || 'Material.pdf'}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#71717A] font-mono">
                          Text Lecture Notes
                        </span>
                      )}
                      
                      <button
                        onClick={() => setActivePdfTopic(t)}
                        className="px-3 py-1.5 bg-[#111113] hover:bg-[#5B8CFF] hover:text-white text-[#5B8CFF] font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 border border-[#242428]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Study & Quiz</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assignments Bento Section */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#F2B866]" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Class Assignments ({assignments.length})
                </h2>
              </div>
              {isTeacher && (
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="text-xs font-semibold text-[#5B8CFF] hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Assignment</span>
                </button>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A]">
                No assignments scheduled for this classroom.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => {
                  const status: AssignmentStatus = (a as any).status || 'open';
                  const mySub = (a as any).mySubmission;
                  const isUpcoming = status === 'upcoming';
                  const isExpired = status === 'expired';

                  return (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl bg-[#161618] border border-[#242428] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                              isUpcoming
                                ? 'bg-[#F2B866]/10 text-[#F2B866] border border-[#F2B866]/20'
                                : isExpired
                                ? 'bg-[#F47C7C]/10 text-[#F47C7C] border border-[#F47C7C]/20'
                                : 'bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/20'
                            }`}
                          >
                            {isUpcoming ? 'Opens Soon' : isExpired ? 'Closed' : 'Active'}
                          </span>

                          {isStudent && mySub && (
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/20 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Submitted</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-[#71717A]">
                          Due {new Date(a.dueAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">
                        {a.title}
                      </h4>

                      <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>

                      {a.attachmentUrl && (
                        <div>
                          <a
                            href={a.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-[#111113] text-[#5B8CFF] font-semibold rounded-lg text-[11px] border border-[#242428] hover:border-[#5B8CFF]/50 transition"
                          >
                            <FileText className="w-3 h-3 text-[#5B8CFF]" />
                            <span>Attachment PDF ↗</span>
                          </a>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-[#242428] flex items-center justify-between">
                        {isStudent && (
                          <>
                            {isUpcoming ? (
                              <span className="text-[11px] font-mono text-[#F2B866]">
                                Opens {new Date(a.availableAt).toLocaleDateString()}
                              </span>
                            ) : isExpired ? (
                              <span className="text-[11px] font-mono text-[#F47C7C]">Deadline passed</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSubmittingAssignment(a);
                                  setSubContent(mySub?.content || '');
                                  setSubPdfFile(null);
                                }}
                                className="px-3.5 py-1.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                              >
                                <Send className="w-3 h-3" />
                                <span>{mySub ? 'Edit Submission' : 'Submit Assignment'}</span>
                              </button>
                            )}
                          </>
                        )}

                        {isTeacher && (
                          <>
                            <span className="text-[11px] font-mono text-[#71717A]">
                              Submissions: <strong className="text-[#F5F5F5]">{(a as any).submissionCount || 0}</strong>
                            </span>
                            <button
                              onClick={() => handleOpenReviewSubmissions(a)}
                              className="px-3 py-1.5 bg-[#111113] hover:bg-[#161618] text-[#5B8CFF] font-semibold rounded-xl text-xs transition border border-[#242428] flex items-center space-x-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Submissions</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Enrolled Students Roster (Teacher Only) */}
      {isTeacher && (
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#65D6B0]" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Enrolled Students ({students.length})
              </h2>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#71717A]">
              No students enrolled yet. Share code <span className="font-mono font-bold text-[#5B8CFF]">{classroom?.code}</span> with your students.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#242428] text-[#71717A] font-mono">
                    <th className="pb-2.5 font-semibold">Student</th>
                    <th className="pb-2.5 font-semibold">Email</th>
                    <th className="pb-2.5 font-semibold">Enrolled On</th>
                    <th className="pb-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242428]">
                  {students.map((s: any) => (
                    <tr key={s.id} className="hover:bg-[#161618] transition">
                      <td className="py-2.5 font-semibold text-[#F5F5F5]">{s.studentName}</td>
                      <td className="py-2.5 text-[#71717A] font-mono">{s.studentEmail}</td>
                      <td className="py-2.5 text-[#71717A] font-mono">{new Date(s.joinedAt).toLocaleDateString()}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleRemoveStudent(s.studentId)}
                          className="px-2.5 py-1 bg-[#F47C7C]/10 hover:bg-[#F47C7C]/20 text-[#F47C7C] font-semibold rounded-lg transition text-[11px] border border-[#F47C7C]/20"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE PDF STUDY MODAL */}
      {activePdfTopic && (
        <PdfAiStudyModal
          topic={activePdfTopic}
          onClose={() => setActivePdfTopic(null)}
        />
      )}

      {/* MODAL: POST CLASSROOM TOPIC & NOTES */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#242428] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#F5F5F5]">
                Post New Topic / Study Material
              </h2>
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#71717A] mb-4">
              Share lecture notes, study discussions, announcements, and optional PDF study documents.
            </p>

            {topicError && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#F47C7C]/10 border border-[#F47C7C]/20 text-xs text-[#F47C7C]">
                {topicError}
              </div>
            )}

            <form onSubmit={handleCreateTopic} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Database Normalization & Indexing"
                  value={topicTitle}
                  onChange={e => setTopicTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Lecture Notes / Discussion Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter key concepts, lecture summary, important questions, or instructions for students..."
                  value={topicContent}
                  onChange={e => setTopicContent(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] resize-none leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#161618]/60 border border-[#242428] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#5B8CFF] font-mono flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Attach PDF Study Resource (Optional)</span>
                  </label>
                  {topicPdfFile && (
                    <button
                      type="button"
                      onClick={() => setTopicPdfFile(null)}
                      className="text-[11px] text-[#F47C7C] hover:underline font-mono"
                    >
                      Remove File
                    </button>
                  )}
                </div>
                
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setTopicPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#A1A1AA] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#161618] file:text-[#5B8CFF] hover:file:bg-[#242428] file:cursor-pointer"
                />

                {topicPdfFile && (
                  <div className="text-[11px] font-mono text-[#65D6B0] flex items-center space-x-1 pt-1">
                    <Check className="w-3 h-3" />
                    <span className="truncate">Selected: {topicPdfFile.name} ({(topicPdfFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#242428]">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topicLoading}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                >
                  {topicLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Posting Topic...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Topic</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE ASSIGNMENT (TEACHER) */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#242428] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-[#F5F5F5] mb-3">
              Schedule New Assignment
            </h2>
            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Report 2: Thread Synchronization"
                  value={asgTitle}
                  onChange={e => setAsgTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Description & Instructions *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail instructions, problem sets, requirements..."
                  value={asgDesc}
                  onChange={e => setAsgDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5B8CFF] mb-1 font-mono">
                    Available Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={asgAvailableAt}
                    onChange={e => setAsgAvailableAt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#F47C7C] mb-1 font-mono">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={asgDueAt}
                    onChange={e => setAsgDueAt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Attach Assignment PDF Document (Optional)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setAsgPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#A1A1AA] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#161618] file:text-[#5B8CFF] hover:file:bg-[#242428]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#242428]">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={asgLoading}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                >
                  {asgLoading ? 'Scheduling...' : 'Schedule Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT SUBMISSION FORM */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#242428] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h2 className="text-base font-bold text-[#F5F5F5] mb-1">
              Submit Assignment
            </h2>
            <p className="text-xs text-[#71717A] mb-3">{submittingAssignment.title}</p>

            {subError && (
              <div className="mb-3 p-2.5 rounded-lg bg-[#F47C7C]/10 border border-[#F47C7C]/20 text-xs text-[#F47C7C]">
                {subError}
              </div>
            )}

            <form onSubmit={handleSubmitAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Written Solution / Response
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your answer, analysis, or explanation..."
                  value={subContent}
                  onChange={e => setSubContent(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">
                  Attach PDF Solution Document (Optional)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setSubPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#A1A1AA] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#161618] file:text-[#5B8CFF] hover:file:bg-[#242428]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#242428]">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subLoading}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 flex items-center space-x-1 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{subLoading ? 'Submitting...' : 'Confirm Submission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: REVIEW STUDENT SUBMISSIONS (TEACHER VIEW) */}
      {reviewAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-[#111113] border-l border-[#242428] w-full max-w-2xl h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-[#242428] mb-5">
                <div>
                  <h2 className="text-base font-bold text-[#F5F5F5]">
                    Student Submissions
                  </h2>
                  <p className="text-xs text-[#71717A]">{reviewAssignment.title}</p>
                </div>
                <button
                  onClick={() => setReviewAssignment(null)}
                  className="p-1.5 rounded-lg bg-[#161618] text-[#71717A] hover:text-[#F5F5F5] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {subsLoading ? (
                <div className="text-center py-12 text-[#71717A] text-xs">Loading submissions...</div>
              ) : submissionsList.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Student Submissions Yet"
                  description="Students enrolled in this classroom have not submitted work for this assignment yet."
                />
              ) : (
                <div className="space-y-3">
                  {submissionsList.map(sub => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl bg-[#161618] border border-[#242428] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#5B8CFF]">{sub.studentName}</span>
                        <span className="text-[#71717A] font-mono">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-[#71717A] font-mono">{sub.studentEmail}</div>

                      {sub.content && (
                        <div className="text-xs text-[#F5F5F5] bg-[#09090B] p-3 rounded-xl border border-[#242428] whitespace-pre-line mt-2 leading-relaxed font-mono">
                          {sub.content}
                        </div>
                      )}

                      {sub.fileUrl && (
                        <div className="pt-2">
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#111113] text-[#5B8CFF] font-semibold rounded-xl text-xs border border-[#242428] hover:border-[#5B8CFF]/50 transition"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>View Submitted PDF Document ↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#242428] text-right">
              <button
                onClick={() => setReviewAssignment(null)}
                className="px-4 py-2 bg-[#161618] text-[#F5F5F5] hover:bg-[#242428] font-semibold rounded-xl text-xs transition border border-[#242428]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
