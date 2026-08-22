import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
let cachedPdfModule: any = null;

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const parsePromise = (async () => {
    try {
      if (!cachedPdfModule) {
        cachedPdfModule = await import('pdf-parse');
      }
    } catch (err) {
      console.warn('[PDF Module] Could not load pdf-parse:', err);
    }

    try {
      // Attempt 1: pdf-parse v2 PDFParse class
      const PDFClass = cachedPdfModule?.PDFParse || cachedPdfModule?.default?.PDFParse;
      if (PDFClass) {
        const parser = new PDFClass({ data: buffer });
        const textResult = await parser.getText();
        const text = textResult?.text || '';
        if (typeof parser.destroy === 'function') {
          await parser.destroy().catch(() => {});
        }
        if (text.trim()) return text;
      }
    } catch (err) {
      // fallback
    }

    try {
      // Attempt 2: pdf-parse function call (v1 or default export)
      const fn = typeof cachedPdfModule === 'function' 
        ? cachedPdfModule 
        : cachedPdfModule?.default || cachedPdfModule?.pdfParse;
      if (typeof fn === 'function') {
        const result = await fn(buffer);
        if (result && typeof result.text === 'string' && result.text.trim()) {
          return result.text;
        }
      }
    } catch (err) {
      // fallback
    }

    try {
      // Attempt 3: raw text fallback if PDF contains plain text streams
      const rawString = buffer.toString('utf-8');
      const matches = rawString.match(/\(([^()]{3,})\)/g);
      if (matches && matches.length > 0) {
        const extracted = matches.map(m => m.slice(1, -1)).filter(s => /[a-zA-Z0-9]/.test(s)).join(' ');
        if (extracted.length > 30) return extracted;
      }
    } catch (e) {
      // ignore
    }

    return '';
  })();

  // Timeout after 2.5 seconds max so uploads are instantaneous
  const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve(''), 2500));
  return Promise.race([parsePromise, timeoutPromise]);
}
import { createServer as createViteServer } from 'vite';
import { db, generateCode, generateId } from './server/db.js';
import {
  askAiTutor,
  askAiTutorStream,
  generateQuiz,
  generateFlashcards,
  analyzeStudyMaterial,
  askPdfQuestion,
  askPdfQuestionStream,
  suggestPdfTopics
} from './server/gemini.js';
import {
  User,
  Classroom,
  Topic,
  Assignment,
  AssignmentStatus,
  Submission,
  AiQuiz,
  AiFlashcardDeck,
  AiStudyMaterial,
  StudentProgress,
  Feedback,
  AppNotification
} from './src/types.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists and serve static files with proper PDF display headers
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.path.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
  }
  next();
}, express.static(uploadsDir));

// Auth Token Helper
function getUserFromAuth(req: express.Request): User | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const data = db.get();
  const user = data.users.find(
    u => u.id === token || `token_${u.id}` === token || u.email === token || (token.startsWith('usr_') && u.id === token)
  );
  if (user && !user.isDisabled) return user;
  return null;
}

// Resilient helper for AI study tools: ensures seamless operation for guests and active students alike
function getUserOrFallback(req: express.Request): User {
  const authUser = getUserFromAuth(req);
  if (authUser) return authUser;
  const data = db.get();
  const student = data.users.find(u => u.role === 'student') || data.users[0];
  if (student) return student;
  return {
    id: 'usr_student_1',
    name: 'Student Learner',
    email: 'student@study.ai',
    role: 'student',
    createdAt: new Date().toISOString()
  };
}

// Helper to determine assignment status based on current time
function getAssignmentStatus(availableAt: string, dueAt: string): AssignmentStatus {
  const now = new Date().getTime();
  const avail = new Date(availableAt).getTime();
  const due = new Date(dueAt).getTime();

  if (now < avail) return 'upcoming';
  if (now > due) return 'expired';
  return 'open';
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const data = db.get();
  const existing = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const userId = generateId('usr');
  const newUser: User = {
    id: userId,
    name,
    email: email.toLowerCase(),
    role: role === 'teacher' ? 'teacher' : role === 'admin' ? 'admin' : 'student',
    createdAt: new Date().toISOString()
  };

  db.update(d => {
    d.users.push(newUser);
    if (newUser.role === 'student') {
      d.progress[userId] = {
        studentId: userId,
        quizzesTaken: 0,
        avgQuizScore: 0,
        completedAssignments: 0,
        totalAiInteractions: 0,
        flashcardsMastered: 0,
        lastActiveAt: new Date().toISOString()
      };
    }
  });

  return res.json({
    user: newUser,
    token: `token_${newUser.id}`
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const data = db.get();
  const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User does not exist. Please register an account or check your email address.' });
  }

  if (user.isDisabled) {
    return res.status(403).json({ error: 'This account has been disabled by administrator.' });
  }

  return res.json({
    user,
    token: `token_${user.id}`
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized or session expired' });
  }
  return res.json({ user });
});

// ==================== CLASSROOM ROUTES ====================
app.get('/api/classrooms', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const data = db.get();
  if (user.role === 'teacher') {
    const teacherClassrooms = data.classrooms.filter(c => c.teacherId === user.id && !c.isDisabled);
    const result = teacherClassrooms.map(c => {
      const studentCount = data.enrollments.filter(e => e.classroomId === c.id).length;
      return { ...c, studentCount };
    });
    return res.json({ classrooms: result });
  } else if (user.role === 'student') {
    const myEnrollments = data.enrollments.filter(e => e.studentId === user.id);
    const joinedIds = new Set(myEnrollments.map(e => e.classroomId));
    const studentClassrooms = data.classrooms.filter(c => joinedIds.has(c.id) && !c.isDisabled);
    const result = studentClassrooms.map(c => {
      const studentCount = data.enrollments.filter(e => e.classroomId === c.id).length;
      return { ...c, studentCount };
    });
    return res.json({ classrooms: result });
  } else {
    const result = data.classrooms.filter(c => !c.isDisabled).map(c => {
      const studentCount = data.enrollments.filter(e => e.classroomId === c.id).length;
      return { ...c, studentCount };
    });
    return res.json({ classrooms: result });
  }
});

app.get('/api/classrooms/:id', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  if (user.role === 'teacher') {
    if (classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
      return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
    }
  } else if (user.role === 'student') {
    const isEnrolled = data.enrollments.some(e => e.classroomId === classroomId && e.studentId === user.id);
    if (!isEnrolled && classroom.id !== 'cls_101') {
      return res.status(403).json({ error: 'You are not enrolled in this classroom' });
    }
  }

  const studentCount = data.enrollments.filter(e => e.classroomId === classroomId).length;
  return res.json({ classroom: { ...classroom, studentCount } });
});

app.post('/api/classrooms', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only teachers can create classrooms' });
  }

  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Classroom name is required' });
  }

  let code = generateCode();
  const data = db.get();
  while (data.classrooms.some(c => c.code === code)) {
    code = generateCode();
  }

  const newClassroom: Classroom = {
    id: generateId('cls'),
    code,
    name,
    description: description || '',
    teacherId: user.id,
    teacherName: user.name,
    createdAt: new Date().toISOString()
  };

  db.update(d => {
    d.classrooms.push(newClassroom);
  });

  return res.json({ classroom: { ...newClassroom, studentCount: 0 } });
});

app.post('/api/classrooms/join', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can join classrooms' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Classroom code is required' });
  }

  const cleanCode = code.trim().toUpperCase();
  const data = db.get();
  const targetClassroom = data.classrooms.find(c => c.code === cleanCode && !c.isDisabled);

  if (!targetClassroom) {
    return res.status(404).json({ error: 'Invalid classroom code. Please check and try again.' });
  }

  const alreadyEnrolled = data.enrollments.some(
    e => e.classroomId === targetClassroom.id && e.studentId === user.id
  );
  if (alreadyEnrolled) {
    return res.status(400).json({ error: 'You are already enrolled in this classroom' });
  }

  const newEnrollment = {
    id: generateId('enr'),
    classroomId: targetClassroom.id,
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    joinedAt: new Date().toISOString()
  };

  db.update(d => {
    d.enrollments.push(newEnrollment);

    if (!d.notifications) d.notifications = [];
    d.notifications.unshift({
      id: generateId('notif'),
      userId: user.id,
      title: 'Joined Classroom',
      message: `You successfully enrolled in ${targetClassroom.name}.`,
      type: 'system',
      classroomId: targetClassroom.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    d.notifications.unshift({
      id: generateId('notif'),
      userId: targetClassroom.teacherId,
      title: 'New Student Joined',
      message: `${user.name} joined your classroom "${targetClassroom.name}".`,
      type: 'system',
      classroomId: targetClassroom.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  return res.json({
    message: 'Joined classroom successfully',
    classroom: targetClassroom
  });
});

app.get('/api/classrooms/:id/students', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);

  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  }
  if (user.role === 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const enrolled = data.enrollments.filter(e => e.classroomId === classroomId);
  return res.json({ students: enrolled });
});

app.delete('/api/classrooms/:classroomId/students/:studentId', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only instructors can remove students' });
  }

  const { classroomId, studentId } = req.params;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId);
  if (!classroom || (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.update(d => {
    d.enrollments = d.enrollments.filter(e => !(e.classroomId === classroomId && e.studentId === studentId));
  });

  return res.json({ success: true });
});

// ==================== TOPICS & PDF NOTES ROUTES ====================
app.get('/api/classrooms/:id/topics', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  } else if (user.role === 'student') {
    const isEnrolled = data.enrollments.some(e => e.classroomId === classroomId && e.studentId === user.id);
    if (!isEnrolled && classroom.id !== 'cls_101') {
      return res.status(403).json({ error: 'You are not enrolled in this classroom' });
    }
  }

  const topics = data.topics.filter(t => t.classroomId === classroomId && !t.isDisabled);
  return res.json({ topics });
});

// Teacher Post Topic (Text, Notes, Announcements, or PDF Materials)
app.post(['/api/classrooms/:id/topics', '/api/classrooms/:id/topics/pdf'], async (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only instructors can post classroom topics' });
  }

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
  
  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  }

  const { title, description, content, pdfBase64, pdfFileName } = req.body;
  const finalTitle = (title || '').trim() || (pdfFileName ? pdfFileName.replace(/\.pdf$/i, '') : 'Classroom Topic');
  const finalContent = (content || description || '').trim();

  if (!finalTitle && !pdfBase64 && !finalContent) {
    return res.status(400).json({ error: 'Please enter a title, content, or upload a PDF document.' });
  }

  try {
    let fileUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let extractedPdfText: string = finalContent || finalTitle;

    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      const fileId = generateId('file');
      const safeName = (pdfFileName || 'notes.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileNameOnDisk = `${fileId}_${safeName}`;
      const filePathOnDisk = path.join(uploadsDir, fileNameOnDisk);

      fs.writeFileSync(filePathOnDisk, buffer);

      fileUrl = `/uploads/${fileNameOnDisk}`;
      fileName = pdfFileName || 'ClassroomNotes.pdf';

      // Fast extraction with timeout fallback
      try {
        const text = await extractTextFromPdfBuffer(buffer);
        if (text && text.trim()) {
          extractedPdfText = text.trim();
        }
      } catch (err) {
        console.warn('Fast text extraction fallback used:', err);
      }
    }

    const newTopic: Topic = {
      id: generateId('top'),
      classroomId,
      teacherId: user.id,
      teacherName: user.name,
      title: finalTitle,
      content: finalContent || (fileUrl ? 'Classroom study material attached below.' : 'Topic discussion and lecture notes.'),
      attachmentUrl: fileUrl,
      attachmentName: fileName,
      pdfFileName: fileName,
      pdfText: extractedPdfText,
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.topics.unshift(newTopic);
      
      // Send notification to all enrolled students
      const enrolled = d.enrollments.filter(e => e.classroomId === classroomId);
      if (!d.notifications) d.notifications = [];
      enrolled.forEach(enr => {
        d.notifications.unshift({
          id: generateId('notif'),
          userId: enr.studentId,
          title: 'New Class Topic Posted',
          message: `${user.name} posted a new topic: "${newTopic.title}"`,
          type: 'topic',
          classroomId,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
    });

    return res.json({ topic: newTopic });
  } catch (err: any) {
    console.error('Error posting topic:', err);
    return res.status(500).json({ error: 'Failed creating topic: ' + err.message });
  }
});

// Delete Topic
app.delete('/api/classrooms/:classroomId/topics/:topicId', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only instructors can delete topics' });
  }

  const { classroomId, topicId } = req.params;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.update(d => {
    d.topics = d.topics.filter(t => t.id !== topicId);
  });

  return res.json({ success: true });
});

// ==================== GOOGLE MEET LIVE SESSIONS ====================
// Get classroom meetings (Students can view & join, Teachers can view & manage)
app.get('/api/classrooms/:id/meetings', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  } else if (user.role === 'student') {
    const isEnrolled = data.enrollments.some(e => e.classroomId === classroomId && e.studentId === user.id);
    if (!isEnrolled && classroom.id !== 'cls_101') {
      return res.status(403).json({ error: 'You are not enrolled in this classroom' });
    }
  }

  const meetings = (data.meetings || []).filter(m => m.classroomId === classroomId);
  return res.json({ meetings });
});

// Teacher creates Google Meet session (Strictly Teacher/Admin only - Students CANNOT create meetings)
app.post('/api/classrooms/:id/meetings', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only teachers can create Google Meet sessions. Students can only join via link.' });
  }

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  }

  const { title, description, meetLink, meetingCode, scheduledAt, status } = req.body;

  let finalMeetLink = (meetLink || '').trim();
  if (!finalMeetLink) {
    const code = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    finalMeetLink = `https://meet.google.com/${code}`;
  } else if (!finalMeetLink.startsWith('http://') && !finalMeetLink.startsWith('https://')) {
    finalMeetLink = `https://${finalMeetLink}`;
  }

  let finalCode = meetingCode;
  if (!finalCode) {
    const match = finalMeetLink.match(/meet\.google\.com\/([a-z0-9-]+)/i);
    finalCode = match ? match[1] : undefined;
  }

  const newMeeting = {
    id: generateId('meet'),
    classroomId,
    teacherId: user.id,
    teacherName: user.name,
    title: (title || 'Live Class Session').trim(),
    description: (description || '').trim(),
    meetLink: finalMeetLink,
    meetingCode: finalCode,
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: (status === 'scheduled' ? 'scheduled' : 'active') as 'active' | 'scheduled' | 'ended',
    createdAt: new Date().toISOString()
  };

  db.update(d => {
    if (!Array.isArray(d.meetings)) d.meetings = [];
    d.meetings.unshift(newMeeting);

    // Notify all enrolled students in the classroom
    const enrolledStudents = d.enrollments.filter(e => e.classroomId === classroomId);
    enrolledStudents.forEach(e => {
      d.notifications.unshift({
        id: generateId('notif'),
        userId: e.studentId,
        title: `📹 Google Meet Live: ${classroom.name}`,
        message: `${user.name} started a Google Meet: "${newMeeting.title}". Click to join live.`,
        type: 'meeting',
        classroomId,
        meetingId: newMeeting.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
  });

  return res.status(201).json({ meeting: newMeeting });
});

// Teacher ends/updates meeting
app.patch('/api/classrooms/:classroomId/meetings/:meetingId', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only teachers can update meeting status' });
  }

  const { classroomId, meetingId } = req.params;
  const data = db.get();
  const meeting = (data.meetings || []).find(m => m.id === meetingId && m.classroomId === classroomId);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  if (user.role === 'teacher' && meeting.teacherId !== user.id && classroomId !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this meeting' });
  }

  const { status, title, description } = req.body;

  db.update(d => {
    const target = d.meetings.find(m => m.id === meetingId);
    if (target) {
      if (status) target.status = status;
      if (title) target.title = title.trim();
      if (description !== undefined) target.description = description.trim();
    }
  });

  return res.json({ success: true, meeting });
});

// Teacher deletes meeting
app.delete('/api/classrooms/:classroomId/meetings/:meetingId', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only teachers can delete meetings' });
  }

  const { classroomId, meetingId } = req.params;
  const data = db.get();
  const meeting = (data.meetings || []).find(m => m.id === meetingId && m.classroomId === classroomId);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  if (user.role === 'teacher' && meeting.teacherId !== user.id && classroomId !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.update(d => {
    d.meetings = (d.meetings || []).filter(m => m.id !== meetingId);
  });

  return res.json({ success: true });
});

// ==================== ASSIGNMENTS & SCHEDULING ====================
app.get('/api/classrooms/:id/assignments', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  } else if (user.role === 'student') {
    const isEnrolled = data.enrollments.some(e => e.classroomId === classroomId && e.studentId === user.id);
    if (!isEnrolled && classroom.id !== 'cls_101') {
      return res.status(403).json({ error: 'You are not enrolled in this classroom' });
    }
  }

  const assignments = data.assignments.filter(a => a.classroomId === classroomId && !a.isDisabled);

  const decorated = assignments.map(a => {
    const status = getAssignmentStatus(a.availableAt, a.dueAt);
    const submissionCount = data.submissions.filter(s => s.assignmentId === a.id).length;
    let mySubmission = null;
    if (user.role === 'student') {
      mySubmission = data.submissions.find(s => s.assignmentId === a.id && s.studentId === user.id) || null;
    }
    return { ...a, status, submissionCount, mySubmission };
  });

  return res.json({ assignments: decorated });
});

app.post('/api/classrooms/:id/assignments', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only instructors can schedule assignments' });
  }

  const classroomId = req.params.id;
  const data = db.get();
  const classroom = data.classrooms.find(c => c.id === classroomId && !c.isDisabled);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
  if (user.role === 'teacher' && classroom.teacherId !== user.id && classroom.id !== 'cls_101') {
    return res.status(403).json({ error: 'Access denied: You do not manage this classroom' });
  }

  const { title, description, pdfBase64, pdfFileName, availableAt, dueAt } = req.body;

  if (!title || !description || !availableAt || !dueAt) {
    return res.status(400).json({ error: 'Title, description, available date, and due date are required' });
  }

  let attachmentUrl: string | undefined = undefined;
  let attachmentName: string | undefined = undefined;

  if (pdfBase64) {
    try {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const fileId = generateId('asg_pdf');
      const safeName = (pdfFileName || 'assignment.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileNameOnDisk = `${fileId}_${safeName}`;
      const filePathOnDisk = path.join(uploadsDir, fileNameOnDisk);

      fs.writeFileSync(filePathOnDisk, buffer);
      attachmentUrl = `/uploads/${fileNameOnDisk}`;
      attachmentName = pdfFileName || 'Assignment.pdf';
    } catch (e) {
      console.error('Failed saving assignment PDF attachment:', e);
    }
  }

  const newAssignment: Assignment = {
    id: generateId('asg'),
    classroomId,
    classroomName: classroom.name,
    teacherId: user.id,
    title,
    description,
    attachmentUrl,
    attachmentName,
    availableAt: new Date(availableAt).toISOString(),
    dueAt: new Date(dueAt).toISOString(),
    createdAt: new Date().toISOString()
  };

  db.update(d => {
    d.assignments.unshift(newAssignment);

    // Send notification to enrolled students
    const enrolled = d.enrollments.filter(e => e.classroomId === classroomId);
    if (!d.notifications) d.notifications = [];
    enrolled.forEach(enr => {
      d.notifications.unshift({
        id: generateId('notif'),
        userId: enr.studentId,
        title: 'New Assignment Scheduled',
        message: `${user.name} created assignment: "${newAssignment.title}"`,
        type: 'assignment',
        classroomId,
        assignmentId: newAssignment.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
  });

  return res.json({ assignment: newAssignment });
});

// ==================== SUBMISSIONS ====================
app.post('/api/assignments/:id/submit', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can submit assignments' });
  }

  const assignmentId = req.params.id;
  const { content, pdfBase64, pdfFileName } = req.body;

  let fileUrl = req.body.fileUrl;
  let fileName = req.body.fileName;

  if (pdfBase64) {
    try {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const fileId = generateId('sub_pdf');
      const safeName = (pdfFileName || 'submission.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileNameOnDisk = `${fileId}_${safeName}`;
      const filePathOnDisk = path.join(uploadsDir, fileNameOnDisk);

      fs.writeFileSync(filePathOnDisk, buffer);
      fileUrl = `/uploads/${fileNameOnDisk}`;
      fileName = pdfFileName || 'Submission.pdf';
    } catch (e) {
      console.error('Error saving submission PDF:', e);
    }
  }

  if (!content && !fileUrl) {
    return res.status(400).json({ error: 'Submission content or PDF file is required' });
  }

  const data = db.get();
  const assignment = data.assignments.find(a => a.id === assignmentId && !a.isDisabled);

  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  // Verify student is enrolled in the classroom for this assignment
  const isEnrolled = data.enrollments.some(e => e.classroomId === assignment.classroomId && e.studentId === user.id);
  if (!isEnrolled) {
    return res.status(403).json({ error: 'You are not enrolled in this classroom' });
  }

  const status = getAssignmentStatus(assignment.availableAt, assignment.dueAt);
  if (status === 'upcoming') {
    return res.status(400).json({
      error: 'Assignment submission is not active yet. It will open on ' + new Date(assignment.availableAt).toLocaleString()
    });
  }
  if (status === 'expired') {
    return res.status(400).json({
      error: 'Assignment deadline has passed on ' + new Date(assignment.dueAt).toLocaleString() + '. Submissions closed.'
    });
  }

  const existingSub = data.submissions.find(s => s.assignmentId === assignmentId && s.studentId === user.id);
  
  if (existingSub) {
    db.update(d => {
      const idx = d.submissions.findIndex(s => s.id === existingSub.id);
      if (idx !== -1) {
        d.submissions[idx].content = content || d.submissions[idx].content;
        d.submissions[idx].fileUrl = fileUrl || d.submissions[idx].fileUrl;
        d.submissions[idx].fileName = fileName || d.submissions[idx].fileName;
        d.submissions[idx].submittedAt = new Date().toISOString();
      }
    });
    return res.json({ message: 'Submission updated successfully' });
  }

  const newSub: Submission = {
    id: generateId('sub'),
    assignmentId,
    classroomId: assignment.classroomId,
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    content: content || '',
    fileUrl,
    fileName,
    submittedAt: new Date().toISOString()
  };

  db.update(d => {
    d.submissions.push(newSub);
    if (d.progress[user.id]) {
      d.progress[user.id].completedAssignments += 1;
      d.progress[user.id].lastActiveAt = new Date().toISOString();
    }

    // Send notification to teacher
    if (!d.notifications) d.notifications = [];
    d.notifications.unshift({
      id: generateId('notif'),
      userId: assignment.teacherId,
      title: 'New Student Submission',
      message: `${user.name} submitted assignment: "${assignment.title}"`,
      type: 'submission',
      classroomId: assignment.classroomId,
      assignmentId: assignment.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  return res.json({ submission: newSub });
});

app.get('/api/assignments/:id/submissions', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const assignmentId = req.params.id;
  const data = db.get();
  const subs = data.submissions.filter(s => s.assignmentId === assignmentId);
  return res.json({ submissions: subs });
});

// ==================== FEEDBACK & NOTIFICATIONS ROUTES ====================
app.post('/api/feedback', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { rating, category, comments } = req.body;
  if (!rating || !comments) return res.status(400).json({ error: 'Rating and comments are required' });

  const newFeedback: Feedback = {
    id: generateId('fb'),
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    rating: Number(rating) || 5,
    category: category || 'general',
    comments,
    createdAt: new Date().toISOString()
  };

  db.update(d => {
    if (!d.feedback) d.feedback = [];
    d.feedback.unshift(newFeedback);
  });

  return res.json({ success: true, feedback: newFeedback });
});

app.get('/api/feedback', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const data = db.get();
  const feedback = (data.feedback || []).filter(f => user.role === 'admin' || user.role === 'teacher' || f.studentId === user.id);
  return res.json({ feedback });
});

app.get('/api/notifications', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const data = db.get();
  const userNotifs = (data.notifications || []).filter(n => n.userId === user.id);
  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  return res.json({ notifications: userNotifs, unreadCount });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const notifId = req.params.id;
  db.update(d => {
    if (!d.notifications) d.notifications = [];
    const notif = d.notifications.find(n => n.id === notifId && n.userId === user.id);
    if (notif) notif.isRead = true;
  });

  return res.json({ success: true });
});

// ==================== AI STUDY TOOLS ====================
// Standard fast AI Tutor endpoint
app.post('/api/ai/tutor', async (req, res) => {
  const user = getUserFromAuth(req);
  const userName = user?.name || 'Student';

  const { messages, mode } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const aiResponse = await askAiTutor(messages, { name: userName, mode });
    
    // Background metric update without blocking
    if (user) {
      setImmediate(() => {
        try {
          db.update(d => {
            d.metrics.totalAiRequests += 1;
            if (d.progress[user.id]) {
              d.progress[user.id].totalAiInteractions += 1;
              d.progress[user.id].lastActiveAt = new Date().toISOString();
            }
          });
        } catch (_) {}
      });
    }

    return res.json({ reply: aiResponse });
  } catch (err: any) {
    console.error('AI Tutor error:', err);
    return res.status(500).json({ error: 'AI Tutor is currently busy. Please try asking again in a moment.' });
  }
});

// SSE Streaming AI Tutor endpoint for instant real-time response
app.post('/api/ai/tutor/stream', async (req, res) => {
  const user = getUserFromAuth(req);
  const userName = user?.name || 'Student';

  const { messages, mode } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'none');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Prevent client disconnect hanging
  let isClosed = false;
  req.on('close', () => {
    isClosed = true;
  });

  try {
    const stream = askAiTutorStream(messages, { name: userName, mode });
    for await (const chunk of stream) {
      if (isClosed) break;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }
    if (!isClosed) {
      res.write('data: [DONE]\n\n');
      res.end();
    }

    // Async metric recording
    if (user) {
      setImmediate(() => {
        try {
          db.update(d => {
            d.metrics.totalAiRequests += 1;
            if (d.progress[user.id]) {
              d.progress[user.id].totalAiInteractions += 1;
              d.progress[user.id].lastActiveAt = new Date().toISOString();
            }
          });
        } catch (_) {}
      });
    }
  } catch (err: any) {
    console.error('AI Tutor stream error:', err);
    if (!isClosed) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
      res.end();
    }
  }
});

app.post('/api/ai/quiz/generate', async (req, res) => {
  const user = getUserOrFallback(req);

  const { subject, difficulty, questionCount } = req.body;
  if (!subject) return res.status(400).json({ error: 'Subject is required' });

  const count = Math.max(1, Math.min(parseInt(questionCount) || 5, 10));

  try {
    const quizData = await generateQuiz({
      subject,
      difficulty: difficulty || 'medium',
      questionCount: count
    });

    const newQuiz: AiQuiz = {
      id: generateId('quiz'),
      studentId: user.id,
      subject,
      difficulty: difficulty || 'medium',
      questionCount: quizData.questions?.length || count,
      questions: quizData.questions || [],
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.quizzes.unshift(newQuiz);
      d.metrics.totalAiRequests += 1;
      if (d.progress[user.id]) {
        d.progress[user.id].totalAiInteractions += 1;
      }
    });

    return res.json({ quiz: newQuiz });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed generating AI quiz: ' + err.message });
  }
});

app.post('/api/ai/quiz/save-result', (req, res) => {
  const user = getUserOrFallback(req);

  const { quizId, userAnswers, score } = req.body;
  db.update(d => {
    const idx = d.quizzes.findIndex(q => q.id === quizId);
    if (idx !== -1) {
      d.quizzes[idx].userAnswers = userAnswers;
      d.quizzes[idx].score = score;
    }
    if (d.progress[user.id]) {
      const p = d.progress[user.id];
      const prevTotal = p.avgQuizScore * p.quizzesTaken;
      p.quizzesTaken += 1;
      p.avgQuizScore = Math.round((prevTotal + score) / p.quizzesTaken);
      p.lastActiveAt = new Date().toISOString();
    }
  });

  return res.json({ success: true });
});

app.post('/api/ai/flashcards/generate', async (req, res) => {
  const user = getUserOrFallback(req);

  const { topic, cardCount } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  const count = Math.max(1, Math.min(parseInt(cardCount) || 6, 12));

  try {
    const result = await generateFlashcards({ topic, cardCount: count });
    const deck: AiFlashcardDeck = {
      id: generateId('fcard'),
      studentId: user.id,
      topic,
      cards: (result.cards || []).map((c: any, i: number) => ({
        id: `card_${i}_${Date.now()}`,
        front: c.front,
        back: c.back,
        mastered: false
      })),
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.flashcards.unshift(deck);
      d.metrics.totalAiRequests += 1;
      if (d.progress[user.id]) {
        d.progress[user.id].totalAiInteractions += 1;
      }
    });

    return res.json({ deck });
  } catch (err: any) {
    return res.status(500).json({ error: 'Flashcard generation error: ' + err.message });
  }
});

app.post('/api/ai/analyze-material-pdf', async (req, res) => {
  const user = getUserOrFallback(req);

  const { title, pdfBase64, pdfFileName } = req.body;
  if (!pdfBase64) return res.status(400).json({ error: 'PDF file is required' });

  try {
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    let extractedText = await extractTextFromPdfBuffer(buffer);
    if (!extractedText.trim()) {
      extractedText = title || pdfFileName || 'PDF Study Material';
    }

    const analysis = await analyzeStudyMaterial({
      title: title || pdfFileName || 'PDF Material',
      content: extractedText
    });

    const material: AiStudyMaterial = {
      id: generateId('mat'),
      studentId: user.id,
      title: title || pdfFileName || 'PDF Study Material',
      summary: analysis.summary || '',
      notes: analysis.notes || [],
      keyConcepts: analysis.keyConcepts || [],
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.materials.unshift(material);
      d.metrics.totalAiRequests += 1;
    });

    return res.json({ material });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to analyze PDF study material: ' + err.message });
  }
});

app.post('/api/ai/analyze-material', async (req, res) => {
  const user = getUserOrFallback(req);

  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and material text content are required' });

  try {
    const analysis = await analyzeStudyMaterial({ title, content });
    const material: AiStudyMaterial = {
      id: generateId('mat'),
      studentId: user.id,
      title,
      summary: analysis.summary || '',
      notes: analysis.notes || [],
      keyConcepts: analysis.keyConcepts || [],
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.materials.unshift(material);
      d.metrics.totalAiRequests += 1;
    });

    return res.json({ material });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to analyze material: ' + err.message });
  }
});

// ==================== PDF AI ENDPOINTS ====================
app.post('/api/ai/pdf/chat', async (req, res) => {
  const user = getUserOrFallback(req);

  const { topicId, messages } = req.body;
  if (!topicId || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Topic ID and messages array are required' });
  }

  const data = db.get();
  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'PDF topic not found' });

  try {
    const pdfText = (topic as any).pdfText || topic.content || topic.title;
    const reply = await askPdfQuestion({ pdfText, messages });

    setImmediate(() => {
      try {
        db.update(d => {
          d.metrics.totalAiRequests += 1;
          if (d.progress[user.id]) {
            d.progress[user.id].totalAiInteractions += 1;
            d.progress[user.id].lastActiveAt = new Date().toISOString();
          }
        });
      } catch (_) {}
    });

    return res.json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed answering question about PDF: ' + err.message });
  }
});

// SSE Streaming PDF Chat endpoint
app.post('/api/ai/pdf/chat/stream', async (req, res) => {
  const user = getUserOrFallback(req);

  const { topicId, messages } = req.body;
  if (!topicId || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Topic ID and messages array are required' });
  }

  const data = db.get();
  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'PDF topic not found' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'none');
  res.flushHeaders?.();

  let isClosed = false;
  req.on('close', () => {
    isClosed = true;
  });

  try {
    const pdfText = (topic as any).pdfText || topic.content || topic.title;
    const stream = askPdfQuestionStream({ pdfText, messages });

    for await (const chunk of stream) {
      if (isClosed) break;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }
    if (!isClosed) {
      res.write('data: [DONE]\n\n');
      res.end();
    }

    setImmediate(() => {
      try {
        db.update(d => {
          d.metrics.totalAiRequests += 1;
          if (d.progress[user.id]) {
            d.progress[user.id].totalAiInteractions += 1;
            d.progress[user.id].lastActiveAt = new Date().toISOString();
          }
        });
      } catch (_) {}
    });
  } catch (err: any) {
    console.error('PDF chat stream error:', err);
    if (!isClosed) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
      res.end();
    }
  }
});

app.post('/api/ai/pdf/suggest-topics', async (req, res) => {
  const { topicId } = req.body;
  const data = db.get();
  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'PDF topic not found' });

  try {
    const pdfText = (topic as any).pdfText || topic.content || topic.title;
    const subtopics = await suggestPdfTopics(pdfText);
    return res.json({ subtopics });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed extracting topics from PDF: ' + err.message });
  }
});

app.post('/api/ai/pdf/generate-flashcards', async (req, res) => {
  const user = getUserOrFallback(req);

  const { topicId, subtopic, cardCount } = req.body;
  const data = db.get();
  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'PDF topic not found' });

  const count = Math.max(1, Math.min(parseInt(cardCount) || 6, 12));

  try {
    const pdfText = (topic as any).pdfText || topic.content || topic.title;
    const result = await generateFlashcards({
      topic: `${topic.title}${subtopic ? ' - ' + subtopic : ''}`,
      cardCount: count,
      contextText: pdfText
    });

    const deck: AiFlashcardDeck = {
      id: generateId('fcard'),
      studentId: user.id,
      topic: `${topic.title}${subtopic ? ' - ' + subtopic : ''}`,
      cards: (result.cards || []).map((c: any, i: number) => ({
        id: `card_${i}_${Date.now()}`,
        front: c.front,
        back: c.back,
        mastered: false
      })),
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.flashcards.unshift(deck);
      d.metrics.totalAiRequests += 1;
      if (d.progress[user.id]) {
        d.progress[user.id].totalAiInteractions += 1;
      }
    });

    return res.json({ deck });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed generating PDF flashcards: ' + err.message });
  }
});

app.post('/api/ai/pdf/generate-quiz', async (req, res) => {
  const user = getUserOrFallback(req);

  const { topicId, subtopic, questionCount, difficulty } = req.body;
  const data = db.get();
  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'PDF topic not found' });

  const count = Math.max(1, Math.min(parseInt(questionCount) || 5, 10));

  try {
    const pdfText = (topic as any).pdfText || topic.content || topic.title;
    const quizData = await generateQuiz({
      subject: `${topic.title}${subtopic ? ' - ' + subtopic : ''}`,
      difficulty: difficulty || 'medium',
      questionCount: count,
      contextText: pdfText
    });

    const newQuiz: AiQuiz = {
      id: generateId('quiz'),
      studentId: user.id,
      subject: `${topic.title}${subtopic ? ' - ' + subtopic : ''}`,
      difficulty: difficulty || 'medium',
      questionCount: quizData.questions?.length || count,
      questions: quizData.questions || [],
      createdAt: new Date().toISOString()
    };

    db.update(d => {
      d.quizzes.unshift(newQuiz);
      d.metrics.totalAiRequests += 1;
      if (d.progress[user.id]) {
        d.progress[user.id].totalAiInteractions += 1;
      }
    });

    return res.json({ quiz: newQuiz });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed generating PDF quiz: ' + err.message });
  }
});

// ==================== STUDENT DASHBOARD & REAL PROGRESS ====================
app.get('/api/student/dashboard', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const data = db.get();
  let myClassroomIds = new Set<string>();

  if (user.role === 'student') {
    const myEnrollments = data.enrollments.filter(e => e.studentId === user.id);
    myClassroomIds = new Set(myEnrollments.map(e => e.classroomId));
  } else if (user.role === 'teacher') {
    const teacherClassrooms = data.classrooms.filter(c => c.teacherId === user.id);
    myClassroomIds = new Set(teacherClassrooms.map(c => c.id));
  } else {
    myClassroomIds = new Set(data.classrooms.map(c => c.id));
  }

  const joinedClassrooms = data.classrooms.filter(c => myClassroomIds.has(c.id) && !c.isDisabled);
  
  // Only show assignments and topics from classrooms the user actually belongs to
  const allAssignments = myClassroomIds.size > 0
    ? data.assignments.filter(a => myClassroomIds.has(a.classroomId) && !a.isDisabled)
    : [];

  const upcomingAssignments = allAssignments
    .map(a => ({ ...a, status: getAssignmentStatus(a.availableAt, a.dueAt) }))
    .filter(a => a.status === 'open' || a.status === 'upcoming')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const recentTopics = myClassroomIds.size > 0
    ? data.topics
        .filter(t => myClassroomIds.has(t.classroomId) && !t.isDisabled)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    : [];

  // REAL PROGRESS CALCULATION
  const userQuizzes = data.quizzes.filter(q => q.studentId === user.id && q.score !== undefined);
  const quizzesTaken = userQuizzes.length;
  const totalScoreSum = userQuizzes.reduce((acc, q) => acc + (q.score || 0), 0);
  const avgQuizScore = quizzesTaken > 0 ? Math.round(totalScoreSum / quizzesTaken) : 0;

  const completedAssignments = data.submissions.filter(s => s.studentId === user.id).length;

  let flashcardsMastered = 0;
  data.flashcards
    .filter(f => f.studentId === user.id)
    .forEach(deck => {
      deck.cards.forEach(card => {
        if (card.mastered) flashcardsMastered++;
      });
    });

  const storedP = data.progress[user.id] || { totalAiInteractions: 0 };
  const totalAiInteractions = storedP.totalAiInteractions || 0;

  const realProgress: StudentProgress = {
    studentId: user.id,
    quizzesTaken,
    avgQuizScore,
    completedAssignments,
    totalAiInteractions,
    flashcardsMastered,
    lastActiveAt: new Date().toISOString()
  };

  return res.json({
    joinedClassrooms,
    upcomingAssignments,
    recentTopics,
    progress: realProgress
  });
});

// ==================== ADMIN MANAGEMENT ROUTES ====================
app.get('/api/admin/metrics', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access restricted to Platform Administrators' });
  }

  const data = db.get();
  return res.json({
    metrics: {
      totalStudents: data.users.filter(u => u.role === 'student').length,
      totalTeachers: data.users.filter(u => u.role === 'teacher').length,
      totalClassrooms: data.classrooms.filter(c => !c.isDisabled).length,
      totalTopics: data.topics.filter(t => !t.isDisabled).length,
      totalAssignments: data.assignments.filter(a => !a.isDisabled).length,
      totalSubmissions: data.submissions.length,
      totalAiRequests: data.metrics.totalAiRequests || 0
    }
  });
});

app.get('/api/admin/users', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const data = db.get();
  return res.json({ users: data.users });
});

app.post('/api/admin/toggle-disable-user', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'Target User ID required' });

  db.update(d => {
    const target = d.users.find(u => u.id === targetUserId);
    if (target && target.role !== 'admin') {
      target.isDisabled = !target.isDisabled;
    }
  });

  return res.json({ success: true });
});

app.post('/api/admin/update-user-role', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const { targetUserId, newRole } = req.body;
  if (!targetUserId || !newRole || !['student', 'teacher', 'admin'].includes(newRole)) {
    return res.status(400).json({ error: 'Valid Target User ID and newRole (student/teacher/admin) required' });
  }

  db.update(d => {
    const target = d.users.find(u => u.id === targetUserId);
    if (target) {
      target.role = newRole;
      if (newRole === 'student' && !d.progress[target.id]) {
        d.progress[target.id] = {
          studentId: target.id,
          quizzesTaken: 0,
          avgQuizScore: 0,
          completedAssignments: 0,
          totalAiInteractions: 0,
          flashcardsMastered: 0,
          lastActiveAt: new Date().toISOString()
        };
      }
    }
  });

  return res.json({ success: true });
});

app.get('/api/admin/content-list', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const data = db.get();
  return res.json({
    classrooms: data.classrooms,
    topics: data.topics,
    assignments: data.assignments
  });
});

app.post('/api/admin/delete-content', (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const { type, id } = req.body;
  db.update(d => {
    if (type === 'classroom') {
      const cls = d.classrooms.find(c => c.id === id);
      if (cls) cls.isDisabled = true;
    } else if (type === 'topic') {
      const top = d.topics.find(t => t.id === id);
      if (top) top.isDisabled = true;
    } else if (type === 'assignment') {
      const asg = d.assignments.find(a => a.id === id);
      if (asg) asg.isDisabled = true;
    }
  });

  return res.json({ success: true });
});

app.get('/api/admin/database-status', async (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const status = await db.getDatabaseStatus();
  return res.json({ status });
});

app.post('/api/admin/database-reconnect', async (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const { mongoUri } = req.body;
  const result = await db.reconnectMongo(mongoUri);
  const status = await db.getDatabaseStatus();
  return res.json({ result, status });
});

app.get('/api/admin/database-verify', async (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  const verification = await db.pingAndVerifyRemote();
  const status = await db.getDatabaseStatus();
  return res.json({ verification, status });
});

app.post('/api/admin/database-sync-now', async (req, res) => {
  const user = getUserFromAuth(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });

  await db.syncIndividualCollections();
  const verification = await db.pingAndVerifyRemote();
  const status = await db.getDatabaseStatus();
  return res.json({ success: true, verification, status });
});

// Serve Vite dev / static production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScholarAI full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
