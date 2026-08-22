import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import {
  User,
  Classroom,
  ClassroomEnrollment,
  Topic,
  Assignment,
  Submission,
  AiTutorSession,
  AiQuiz,
  AiFlashcardDeck,
  AiStudyMaterial,
  StudentProgress,
  Feedback,
  AppNotification,
  ClassroomMeeting,
  PlatformMetrics
} from '../src/types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface Schema {
  users: User[];
  classrooms: Classroom[];
  enrollments: ClassroomEnrollment[];
  topics: Topic[];
  assignments: Assignment[];
  submissions: Submission[];
  meetings: ClassroomMeeting[];
  tutorSessions: AiTutorSession[];
  quizzes: AiQuiz[];
  flashcards: AiFlashcardDeck[];
  studyPlans: any[];
  materials: AiStudyMaterial[];
  feedback: Feedback[];
  notifications: AppNotification[];
  progress: Record<string, StudentProgress>;
  metrics: {
    totalAiRequests: number;
  };
}

const initialDb: Schema = {
  users: [
    {
      id: 'usr_admin',
      name: 'System Administrator',
      email: 'admin@study.ai',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_teacher_1',
      name: 'Prof. Sarah Jenkins',
      email: 'teacher@study.ai',
      role: 'teacher',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_student_1',
      name: 'Alex Johnson',
      email: 'student@study.ai',
      role: 'student',
      createdAt: new Date().toISOString()
    }
  ],
  classrooms: [
    {
      id: 'cls_101',
      code: 'PYT72K',
      name: 'AP Computer Science & Python',
      description: 'Master core programming concepts, algorithms, and data structures.',
      teacherId: 'usr_teacher_1',
      teacherName: 'Prof. Sarah Jenkins',
      createdAt: new Date().toISOString()
    }
  ],
  enrollments: [],
  topics: [
    {
      id: 'top_101',
      classroomId: 'cls_101',
      teacherId: 'usr_teacher_1',
      teacherName: 'Prof. Sarah Jenkins',
      title: 'Introduction to Control Flow & Functions',
      content: 'Welcome class! Please review key concepts on conditionals, loops, and function signatures. We will cover recursion next week.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  assignments: [
    {
      id: 'asg_101',
      classroomId: 'cls_101',
      classroomName: 'AP Computer Science & Python',
      teacherId: 'usr_teacher_1',
      title: 'Python Recursion & Algorithmic Practice',
      description: 'Implement fibonacci and binary search recursively in Python. Include output screenshots and time complexity analysis.',
      availableAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ],
  submissions: [],
  meetings: [],
  tutorSessions: [],
  quizzes: [],
  flashcards: [],
  studyPlans: [],
  materials: [],
  feedback: [],
  notifications: [],
  progress: {
    usr_student_1: {
      studentId: 'usr_student_1',
      quizzesTaken: 0,
      avgQuizScore: 0,
      completedAssignments: 0,
      totalAiInteractions: 0,
      flashcardsMastered: 0,
      lastActiveAt: new Date().toISOString()
    }
  },
  metrics: {
    totalAiRequests: 0
  }
};

export function sanitizeMongoUri(rawUri: string): string {
  if (!rawUri) return '';
  let uri = rawUri.trim().replace(/^["']|["']$/g, '');
  
  // Match standard and SRV connection strings: mongodb+srv://user:pass@host/path
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(?:([^:]+):([^@]+)@)?(.*)$/);
  if (!match) return uri;

  const [, prefix, user, pass, rest] = match;
  if (!user || !pass) return uri;

  // Strip accidental angle brackets if user copied the template literally (e.g. <username>:<password>)
  let cleanUser = user.replace(/^<|>$/g, '');
  let cleanPass = pass.replace(/^<|>$/g, '');

  try {
    cleanUser = encodeURIComponent(decodeURIComponent(cleanUser));
    cleanPass = encodeURIComponent(decodeURIComponent(cleanPass));
  } catch (_) {
    // If decoding failed, keep clean string
  }

  return `${prefix}${cleanUser}:${cleanPass}@${rest}`;
}

class CloudOrLocalDatabase {
  private data: Schema;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadLocalData();
    this.initMongo().catch(() => {});
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private configFilePath = path.join(process.cwd(), 'data', 'mongo_config.json');

  private loadSavedMongoUri(): string | undefined {
    try {
      if (process.env.MONGODB_URI) return sanitizeMongoUri(process.env.MONGODB_URI);
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed?.mongoUri) {
          const sanitized = sanitizeMongoUri(parsed.mongoUri);
          process.env.MONGODB_URI = sanitized;
          return sanitized;
        }
      }
    } catch (_) {}
    return process.env.MONGODB_URI ? sanitizeMongoUri(process.env.MONGODB_URI) : undefined;
  }

  private saveMongoUriToDisk(uri: string) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(this.configFilePath, JSON.stringify({ mongoUri: uri, updatedAt: new Date().toISOString() }, null, 2));
    } catch (_) {}
  }

  private loadLocalData(): Schema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const res = { ...initialDb, ...parsed };
        if (!Array.isArray(res.meetings)) res.meetings = [];
        return res;
      }
    } catch (err) {
      console.error('Failed reading local DB file, initializing default:', err);
    }
    this.saveLocalData(initialDb);
    return initialDb;
  }

  private saveLocalData(data: Schema) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed writing local DB file:', err);
    }
  }

  private async initMongo(customUri?: string) {
    const rawUri = customUri || this.loadSavedMongoUri();
    if (!rawUri) {
      console.log('ℹ️ [Database] Running on local/container storage. (To persist across restarts, set MONGODB_URI in .env or cloud config).');
      return { success: false, message: 'MONGODB_URI is not set. Using local database.' };
    }

    const mongoUri = sanitizeMongoUri(rawUri);

    try {
      console.log('🔄 [Database] Connecting to MongoDB Atlas database...');
      if (this.mongoClient) {
        try {
          await this.mongoClient.close();
        } catch (_) {}
      }

      this.mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      });

      await this.mongoClient.connect();
      // Test ping
      await this.mongoClient.db('admin').command({ ping: 1 }).catch(() => {});

      // Use database name from URI or default to scholar_ai_db
      this.mongoDb = this.mongoClient.db('scholar_ai_db');
      this.isMongoConnected = true;
      process.env.MONGODB_URI = mongoUri;
      this.saveMongoUriToDisk(mongoUri);

      console.log('✅ [Database] Successfully connected to MongoDB Atlas! Cloud persistence active.');

      // Hydrate memory from cloud database
      const cloudDoc = await this.mongoDb.collection('app_state').findOne({ _id: 'main_database_state' as any });
      if (cloudDoc && (cloudDoc as any).data) {
        this.data = {
          ...initialDb,
          ...(cloudDoc as any).data
        };
        if (!Array.isArray(this.data.meetings)) this.data.meetings = [];
        this.saveLocalData(this.data);
        console.log(`📦 [Database] Hydrated ${this.data.users.length} users, ${this.data.classrooms.length} classrooms, ${this.data.assignments.length} assignments from MongoDB.`);
      } else {
        // Seed initial data to cloud
        await this.mongoDb.collection('app_state').updateOne(
          { _id: 'main_database_state' as any },
          { $set: { data: this.data, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        console.log('🌱 [Database] Initialized cloud database collection with schema.');
      }

      // Sync discrete collections immediately
      await this.syncIndividualCollections();
      return { success: true, message: 'Connected to MongoDB Atlas! All collections synced.' };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      let userFriendlyMsg = errMsg;
      if (errMsg.toLowerCase().includes('bad auth') || errMsg.toLowerCase().includes('authentication failed')) {
        userFriendlyMsg = 'Authentication failed with MongoDB Atlas. Please check that your Database User (under Atlas > Security > Database Access) username and password match. Note: this is different from your Atlas website login.';
        console.warn('ℹ️ [Database] MongoDB authentication failed (bad auth). Ensure your Database User credentials in MongoDB Atlas are correct. App is running safely on persistent local storage.');
      } else {
        console.error('⚠️ [Database] Failed to connect to MongoDB Atlas, continuing with local storage:', errMsg);
      }
      this.isMongoConnected = false;
      return { success: false, message: userFriendlyMsg };
    }
  }

  public async syncIndividualCollections() {
    if (!this.isMongoConnected || !this.mongoDb) return;
    try {
      // Upsert individual collections for direct MongoDB queries & indexing
      const collections: Array<{ name: string; items: any[] }> = [
        { name: 'users', items: this.data.users },
        { name: 'classrooms', items: this.data.classrooms },
        { name: 'topics', items: this.data.topics },
        { name: 'assignments', items: this.data.assignments },
        { name: 'submissions', items: this.data.submissions },
        { name: 'meetings', items: this.data.meetings || [] },
        { name: 'quizzes', items: this.data.quizzes || [] },
        { name: 'flashcards', items: this.data.flashcards || [] },
        { name: 'feedback', items: this.data.feedback || [] },
        { name: 'notifications', items: this.data.notifications || [] }
      ];

      for (const col of collections) {
        if (col.items.length > 0) {
          const bulkOps = col.items.map(item => ({
            updateOne: {
              filter: { _id: (item.id || item._id) as any },
              update: { $set: { ...item, _id: item.id || item._id } },
              upsert: true
            }
          }));
          await this.mongoDb.collection(col.name).bulkWrite(bulkOps);
        }
      }
    } catch (err) {
      console.warn('Individual MongoDB collections sync note:', err);
    }
  }

  private syncToMongo() {
    if (!this.isMongoConnected || !this.mongoDb) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce cloud sync slightly to batch rapid writes
    this.saveTimeout = setTimeout(async () => {
      try {
        if (this.mongoDb) {
          await this.mongoDb.collection('app_state').updateOne(
            { _id: 'main_database_state' as any },
            { $set: { data: this.data, updatedAt: new Date().toISOString() } },
            { upsert: true }
          );
          await this.syncIndividualCollections();
        }
      } catch (err) {
        console.error('⚠️ [Database] Error syncing state to MongoDB Atlas:', err);
      }
    }, 400);
  }

  public get(): Schema {
    return this.data;
  }

  public update(updater: (data: Schema) => void) {
    updater(this.data);
    this.saveLocalData(this.data);
    this.syncToMongo();
  }

  public async getDatabaseStatus() {
    const mongoUri = process.env.MONGODB_URI;
    const maskedUri = mongoUri
      ? mongoUri.replace(/(mongodb(\+srv)?:\/\/)([^:@]+):([^@]+)@/, '$1$3:••••••••@')
      : null;

    let collectionsCount: Record<string, number> = {
      users: this.data.users.length,
      classrooms: this.data.classrooms.length,
      topics: this.data.topics.length,
      assignments: this.data.assignments.length,
      submissions: this.data.submissions.length,
      meetings: (this.data.meetings || []).length,
      quizzes: (this.data.quizzes || []).length,
      flashcards: (this.data.flashcards || []).length,
      materials: (this.data.materials || []).length,
      feedback: (this.data.feedback || []).length,
      notifications: (this.data.notifications || []).length
    };

    return {
      connectedToMongo: this.isMongoConnected,
      databaseType: this.isMongoConnected ? 'MongoDB Atlas (Cloud)' : 'Local File Store (Container)',
      databaseName: this.isMongoConnected ? 'scholar_ai_db' : 'Local db.json',
      mongoUriConfigured: !!mongoUri,
      maskedUri,
      collectionsCount,
      totalDocuments: Object.values(collectionsCount).reduce((a, b) => a + b, 0),
      lastSyncAt: new Date().toISOString()
    };
  }

  public async reconnectMongo(uri?: string) {
    return await this.initMongo(uri);
  }

  public async pingAndVerifyRemote() {
    if (!this.isMongoConnected || !this.mongoDb || !this.mongoClient) {
      return {
        connected: false,
        error: 'MongoDB is not currently connected. Please configure your MONGODB_URI.'
      };
    }

    try {
      const startTime = Date.now();
      await this.mongoDb.command({ ping: 1 });
      const latencyMs = Date.now() - startTime;

      // Force a full sync to guarantee everything is up to date in MongoDB
      await this.syncIndividualCollections();

      // Query actual counts directly from the remote MongoDB Atlas database
      const remoteUserCount = await this.mongoDb.collection('users').countDocuments();
      const remoteClassroomCount = await this.mongoDb.collection('classrooms').countDocuments();
      const remoteAssignmentsCount = await this.mongoDb.collection('assignments').countDocuments();

      // Fetch the last 5 users directly from remote MongoDB Atlas collection
      const recentMongoUsers = await this.mongoDb.collection('users')
        .find({}, { projection: { password: 0 } })
        .limit(5)
        .toArray();

      return {
        connected: true,
        latencyMs,
        databaseName: this.mongoDb.databaseName,
        remoteCounts: {
          users: remoteUserCount,
          classrooms: remoteClassroomCount,
          assignments: remoteAssignmentsCount
        },
        recentMongoUsers: recentMongoUsers.map((u: any) => ({
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt
        })),
        verifiedAt: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err?.message || 'Error querying remote MongoDB'
      };
    }
  }
}

export const db = new CloudOrLocalDatabase();

// Helper generators
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

