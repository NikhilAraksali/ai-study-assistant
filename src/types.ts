export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isDisabled?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Classroom {
  id: string;
  code: string; // e.g. "PYT72K"
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  studentCount?: number;
  standard?: string;
  createdAt: string;
  isDisabled?: boolean;
}

export interface ClassroomEnrollment {
  id: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  joinedAt: string;
}

export interface Topic {
  id: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  pdfFileName?: string;
  pdfText?: string;
  createdAt: string;
  isDisabled?: boolean;
}

export interface Assignment {
  id: string;
  classroomId: string;
  classroomName?: string;
  teacherId: string;
  title: string;
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  availableAt: string; // ISO string
  dueAt: string; // ISO string
  status?: AssignmentStatus;
  createdAt: string;
  isDisabled?: boolean;
  submissionCount?: number;
}

export type AssignmentStatus = 'upcoming' | 'open' | 'expired';

export interface Submission {
  id: string;
  assignmentId: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  submittedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface AiTutorSession {
  id: string;
  studentId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface AiQuiz {
  id: string;
  studentId: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questions: QuizQuestion[];
  userAnswers?: number[];
  score?: number; // percentage or count
  createdAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastered?: boolean;
}

export interface AiFlashcardDeck {
  id: string;
  studentId: string;
  topic: string;
  cards: Flashcard[];
  createdAt: string;
}

export interface KeyConcept {
  term: string;
  definition: string;
}

export interface AiStudyMaterial {
  id: string;
  studentId: string;
  title: string;
  summary: string;
  notes: string[];
  keyConcepts: KeyConcept[];
  createdAt: string;
}

export interface StudentProgress {
  studentId: string;
  quizzesTaken: number;
  avgQuizScore: number;
  completedAssignments: number;
  totalAiInteractions: number;
  flashcardsMastered: number;
  lastActiveAt: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rating: number; // 1 to 5 stars
  category: 'classroom' | 'ai_tools' | 'general' | 'assignments';
  comments: string;
  createdAt: string;
}

export interface ClassroomMeeting {
  id: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  meetLink: string;
  meetingCode?: string;
  scheduledAt?: string;
  status: 'active' | 'scheduled' | 'ended';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'topic' | 'assignment' | 'submission' | 'feedback' | 'meeting' | 'system';
  classroomId?: string;
  assignmentId?: string;
  meetingId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalClassrooms: number;
  totalTopics: number;
  totalAssignments: number;
  totalSubmissions: number;
  totalAiRequests: number;
}
