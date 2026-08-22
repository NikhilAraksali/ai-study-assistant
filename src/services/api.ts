import {
  User,
  AuthResponse,
  Classroom,
  Topic,
  Assignment,
  Submission,
  AiQuiz,
  AiFlashcardDeck,
  AiStudyMaterial,
  StudentProgress,
  PlatformMetrics,
  Feedback,
  AppNotification,
  ClassroomMeeting
} from '../types';

const TOKEN_KEY = 'ai_study_assistant_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data as T;
  } catch (err: any) {
    if (retries > 0 && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError'))) {
      await new Promise(r => setTimeout(r, 600));
      return fetchApi<T>(endpoint, options, retries - 1);
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (data: { name: string; email: string; password: string; role: string; standard?: string }) =>
    fetchApi<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    fetchApi<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => fetchApi<{ user: User }>('/api/auth/me'),

  // Classrooms
  getClassrooms: () => fetchApi<{ classrooms: Classroom[] }>('/api/classrooms'),

  getClassroom: (classroomId: string) =>
    fetchApi<{ classroom: Classroom }>(`/api/classrooms/${classroomId}`),

  createClassroom: (data: { name: string; description?: string }) =>
    fetchApi<{ classroom: Classroom }>('/api/classrooms', { method: 'POST', body: JSON.stringify(data) }),

  joinClassroom: (code: string) =>
    fetchApi<{ classroom: Classroom }>('/api/classrooms/join', { method: 'POST', body: JSON.stringify({ code }) }),

  getClassroomStudents: (classroomId: string) =>
    fetchApi<{ students: any[] }>(`/api/classrooms/${classroomId}/students`),

  removeStudentFromClassroom: (classroomId: string, studentId: string) =>
    fetchApi<{ success: boolean }>(`/api/classrooms/${classroomId}/students/${studentId}`, { method: 'DELETE' }),

  // Topics & PDF Notes
  getTopics: (classroomId: string) =>
    fetchApi<{ topics: Topic[] }>(`/api/classrooms/${classroomId}/topics`),

  createTopic: (
    classroomId: string,
    data: { title: string; content?: string; description?: string; pdfBase64?: string; pdfFileName?: string }
  ) => fetchApi<{ topic: Topic }>(`/api/classrooms/${classroomId}/topics`, { method: 'POST', body: JSON.stringify(data) }),

  uploadPdfTopic: (classroomId: string, data: { title?: string; description?: string; pdfBase64: string; pdfFileName: string }) =>
    fetchApi<{ topic: Topic }>(`/api/classrooms/${classroomId}/topics/pdf`, { method: 'POST', body: JSON.stringify(data) }),

  deleteTopic: (classroomId: string, topicId: string) =>
    fetchApi<{ success: boolean }>(`/api/classrooms/${classroomId}/topics/${topicId}`, { method: 'DELETE' }),

  // Google Meet Live Sessions
  getMeetings: (classroomId: string) =>
    fetchApi<{ meetings: ClassroomMeeting[] }>(`/api/classrooms/${classroomId}/meetings`),

  createMeeting: (
    classroomId: string,
    data: { title: string; description?: string; meetLink?: string; meetingCode?: string; scheduledAt?: string; status?: 'active' | 'scheduled' }
  ) => fetchApi<{ meeting: ClassroomMeeting }>(`/api/classrooms/${classroomId}/meetings`, { method: 'POST', body: JSON.stringify(data) }),

  updateMeeting: (
    classroomId: string,
    meetingId: string,
    data: { status?: 'active' | 'scheduled' | 'ended'; title?: string; description?: string }
  ) => fetchApi<{ success: boolean; meeting: ClassroomMeeting }>(`/api/classrooms/${classroomId}/meetings/${meetingId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteMeeting: (classroomId: string, meetingId: string) =>
    fetchApi<{ success: boolean }>(`/api/classrooms/${classroomId}/meetings/${meetingId}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: (classroomId: string) =>
    fetchApi<{ assignments: Assignment[] }>(`/api/classrooms/${classroomId}/assignments`),

  createAssignment: (
    classroomId: string,
    data: { title: string; description: string; pdfBase64?: string; pdfFileName?: string; availableAt: string; dueAt: string }
  ) => fetchApi<{ assignment: Assignment }>(`/api/classrooms/${classroomId}/assignments`, { method: 'POST', body: JSON.stringify(data) }),

  submitAssignment: (assignmentId: string, data: { content?: string; pdfBase64?: string; pdfFileName?: string }) =>
    fetchApi<{ submission: Submission }>(`/api/assignments/${assignmentId}/submit`, { method: 'POST', body: JSON.stringify(data) }),

  getSubmissions: (assignmentId: string) =>
    fetchApi<{ submissions: Submission[] }>(`/api/assignments/${assignmentId}/submissions`),

  // AI Study Tools
  askAiTutor: (messages: Array<{ role: 'user' | 'model'; content: string }>, mode?: string, signal?: AbortSignal) =>
    fetchApi<{ reply: string }>('/api/ai/tutor', { method: 'POST', body: JSON.stringify({ messages, mode }), signal }),

  streamAiTutor: async (
    messages: Array<{ role: 'user' | 'model'; content: string }>,
    onChunk: (chunk: string) => void,
    mode?: string,
    signal?: AbortSignal
  ): Promise<string> => {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/tutor/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, mode }),
        signal
      });

      if (!res.ok || !res.body) {
        // Fallback to standard request
        const fallback = await api.askAiTutor(messages, mode, signal);
        onChunk(fallback.reply);
        return fallback.reply;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6);
            if (rawData === '[DONE]') {
              if (fullText) return fullText;
            }
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.chunk) {
                fullText += parsed.chunk;
                onChunk(parsed.chunk);
              }
            } catch (_) {}
          }
        }
      }

      if (fullText) {
        return fullText;
      }

      // If stream ended with no tokens, fallback to direct tutor endpoint
      const fallback = await api.askAiTutor(messages, mode, signal);
      onChunk(fallback.reply);
      return fallback.reply;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('Stream failed, falling back to direct AI endpoint:', err);
      const fallback = await api.askAiTutor(messages, mode, signal);
      onChunk(fallback.reply);
      return fallback.reply;
    }
  },

  generateQuiz: (data: { subject: string; difficulty: string; questionCount: number }, signal?: AbortSignal) =>
    fetchApi<{ quiz: AiQuiz }>('/api/ai/quiz/generate', { method: 'POST', body: JSON.stringify(data), signal }),

  saveQuizResult: (quizId: string, userAnswers: number[], score: number) =>
    fetchApi<{ success: boolean }>('/api/ai/quiz/save-result', { method: 'POST', body: JSON.stringify({ quizId, userAnswers, score }) }),

  generateFlashcards: (topic: string, cardCount?: number, signal?: AbortSignal) =>
    fetchApi<{ deck: AiFlashcardDeck }>('/api/ai/flashcards/generate', { method: 'POST', body: JSON.stringify({ topic, cardCount }), signal }),

  analyzeMaterialPdf: (data: { title: string; pdfBase64: string; pdfFileName: string }) =>
    fetchApi<{ material: AiStudyMaterial }>('/api/ai/analyze-material-pdf', { method: 'POST', body: JSON.stringify(data) }),

  // Feedback System
  submitFeedback: (data: { rating: number; category: string; comments: string }) =>
    fetchApi<{ success: boolean; feedback: Feedback }>('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),

  getStudentFeedback: () =>
    fetchApi<{ feedback: Feedback[] }>('/api/feedback'),

  // Notifications System
  getNotifications: () =>
    fetchApi<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications'),

  markNotificationRead: (notificationId: string) =>
    fetchApi<{ success: boolean }>(`/api/notifications/${notificationId}/read`, { method: 'POST' }),

  // PDF AI Features
  askPdfAi: (topicId: string, messages: Array<{ role: 'user' | 'model'; content: string }>, signal?: AbortSignal) =>
    fetchApi<{ reply: string }>('/api/ai/pdf/chat', { method: 'POST', body: JSON.stringify({ topicId, messages }), signal }),

  streamPdfAi: async (
    topicId: string,
    messages: Array<{ role: 'user' | 'model'; content: string }>,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> => {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/pdf/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topicId, messages }),
        signal
      });

      if (!res.ok || !res.body) {
        const fallback = await api.askPdfAi(topicId, messages, signal);
        onChunk(fallback.reply);
        return fallback.reply;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6);
            if (rawData === '[DONE]') {
              if (fullText) return fullText;
            }
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.chunk) {
                fullText += parsed.chunk;
                onChunk(parsed.chunk);
              }
            } catch (_) {}
          }
        }
      }

      if (fullText) return fullText;
      const fallback = await api.askPdfAi(topicId, messages, signal);
      onChunk(fallback.reply);
      return fallback.reply;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('PDF stream failed, falling back to direct AI endpoint:', err);
      const fallback = await api.askPdfAi(topicId, messages, signal);
      onChunk(fallback.reply);
      return fallback.reply;
    }
  },

  suggestPdfTopics: (topicId: string) =>
    fetchApi<{ subtopics: string[] }>('/api/ai/pdf/suggest-topics', { method: 'POST', body: JSON.stringify({ topicId }) }),

  generatePdfFlashcards: (topicId: string, subtopic?: string, cardCount?: number, signal?: AbortSignal) =>
    fetchApi<{ deck: AiFlashcardDeck }>('/api/ai/pdf/generate-flashcards', { method: 'POST', body: JSON.stringify({ topicId, subtopic, cardCount }), signal }),

  generatePdfQuiz: (topicId: string, subtopic?: string, questionCount?: number, difficulty?: string, signal?: AbortSignal) =>
    fetchApi<{ quiz: AiQuiz }>('/api/ai/pdf/generate-quiz', { method: 'POST', body: JSON.stringify({ topicId, subtopic, questionCount, difficulty }), signal }),

  // Student Dashboard & Real Progress
  getStudentDashboard: () =>
    fetchApi<{
      joinedClassrooms: Classroom[];
      upcomingAssignments: Assignment[];
      recentTopics: Topic[];
      progress: StudentProgress;
    }>('/api/student/dashboard'),

  // Admin
  getAdminMetrics: () => fetchApi<{ metrics: PlatformMetrics }>('/api/admin/metrics'),

  getAdminUsers: () => fetchApi<{ users: User[] }>('/api/admin/users'),

  toggleDisableUser: (targetUserId: string) =>
    fetchApi<{ success: boolean }>('/api/admin/toggle-disable-user', { method: 'POST', body: JSON.stringify({ targetUserId }) }),

  updateUserRole: (targetUserId: string, newRole: 'student' | 'teacher' | 'admin') =>
    fetchApi<{ success: boolean }>('/api/admin/update-user-role', { method: 'POST', body: JSON.stringify({ targetUserId, newRole }) }),

  getAdminContentList: () =>
    fetchApi<{ classrooms: Classroom[]; topics: Topic[]; assignments: Assignment[] }>('/api/admin/content-list'),

  deleteContent: (type: 'classroom' | 'topic' | 'assignment', id: string) =>
    fetchApi<{ success: boolean }>('/api/admin/delete-content', { method: 'POST', body: JSON.stringify({ type, id }) }),

  getDatabaseStatus: () =>
    fetchApi<{
      status: {
        connectedToMongo: boolean;
        databaseType: string;
        databaseName: string;
        mongoUriConfigured: boolean;
        maskedUri: string | null;
        collectionsCount: Record<string, number>;
        totalDocuments: number;
        lastSyncAt: string;
      };
    }>('/api/admin/database-status'),

  reconnectDatabase: (mongoUri?: string) =>
    fetchApi<{
      result: { success: boolean; message: string };
      status: any;
    }>('/api/admin/database-reconnect', { method: 'POST', body: JSON.stringify({ mongoUri }) }),

  verifyDatabase: () =>
    fetchApi<{
      verification: {
        connected: boolean;
        latencyMs?: number;
        databaseName?: string;
        remoteCounts?: Record<string, number>;
        recentMongoUsers?: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
        verifiedAt?: string;
        error?: string;
      };
      status: any;
    }>('/api/admin/database-verify'),

  syncDatabaseNow: () =>
    fetchApi<{
      success: boolean;
      verification: any;
      status: any;
    }>('/api/admin/database-sync-now', { method: 'POST' })
};
