// deno-lint-ignore-file no-explicit-any
import { MongoClient, collection, dbId, withIndex } from '@diister/mongodbee';
import * as v from '@diister/mongodbee/schema';
import { getConfig } from '../../config/appConfig.ts';

import * as u from './user.ts';
import * as e from './exam.ts';
import * as t from './tasks.ts';
import * as g from './tags.ts';
import * as f from './files.ts';
import * as q from './qr.ts';

let db: ExamToolboxDatabase;

export async function getOrCreateDb(): Promise<ExamToolboxDatabase> {
  if (db) return db;

  const connString = getConfig().db.connString;
  async function initReplSet() {
    const host = new URL(connString).hostname;
    const mongoClient = new MongoClient(connString, {
      replicaSet: 'rs0',
      directConnection: true,
    });
    const adminDb = mongoClient.db('admin');
    try {
      const status = await adminDb.command({
        replSetGetStatus: { replicaSet: 'rs0' },
      });
      if (status.ok) return;
    } catch (_) {
      await adminDb.command({
        replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host }] },
      });
    }
  }

  await initReplSet();
  const client = new MongoClient(connString, {
    replicaSet: 'rs0',
    writeConcern: { w: 'majority' },
  });

  await client.connect();
  // Extract database name from the connection string path component
  const dbName = new URL(connString).pathname.slice(1);
  const mongoDb = client.db(dbName);

  // ── Schemas ───────────────────────────────────────────────────────────────
  // Schemas are intentionally loose (v.any() for nested structures) since
  // application-level validation is handled by parseExam / parseTask.

  const examSchema = {
    _id: dbId('exam'),
    courseName: v.string(),
    examinerName: v.string(),
    semester: v.string(),
    date: v.string(),
    examLengthMinutes: v.number(),
    tasks: v.any(),
    points: v.optional(v.number()),
    pageCount: v.optional(v.number()),
    conceptPages: v.optional(v.number()),
    lastEditedBy: v.optional(v.string()),
    updatedAt: v.optional(v.any()),
    access: v.object({
      users: v.optional(v.array(v.string())),
      groups: v.optional(v.array(v.string())),
    }),
  };

  const taskSchema = {
    _id: dbId('task'),
    type: v.string(),
    question: v.any(),
    points: v.number(),
    tagIds: v.array(v.string()),
    tags: v.any(),
    createdBy: v.string(),
    createdAt: v.any(),
    lastUsed: v.any(),
    usedIn: v.array(v.string()),
    parent: v.optional(v.string()),
    children: v.array(v.string()),
    numCorrect: v.optional(v.any()),
    answerOptions: v.optional(v.any()),
    header: v.optional(v.any()),
    lines: v.optional(v.any()),
    noLines: v.optional(v.any()),
    solution: v.optional(v.any()),
    questionPicture: v.optional(v.any()),
    solutionPicture: v.optional(v.any()),
    size: v.optional(v.any()),
    questionLatex: v.optional(v.any()),
    tableHeadersQuestion: v.optional(v.any()),
    tableDataQuestion: v.optional(v.any()),
    tableHeadersSolution: v.optional(v.any()),
    tableDataSolution: v.optional(v.any()),
  };

  const tagSchema = {
    _id: dbId('tag'),
    name: v.string(),
    color: v.optional(v.string()),
    textColor: v.optional(v.string()),
  };

  const fileTrackerSchema = {
    _id: dbId('file'),
    name: v.string(),
    refs: v.optional(v.array(v.string())),
  };

  const userSchema = {
    _id: dbId('user'),
    sub: withIndex(v.string(), { unique: true }),
    name: v.string(),
    email: v.pipe(v.string(), v.email()),
    active: v.boolean(),
    groups: v.array(v.string()),
    lastLoginAt: v.optional(v.date()),
    createdAt: v.date(),
  };

  const groupSchema = {
    _id: dbId('group'),
    name: withIndex(v.string(), { unique: true }),
    rights: v.optional(v.any()),
  };

  const qrCodeSchema = {
    _id: dbId('qr'),
    studentsPerLanguage: v.optional(v.number()),
    pagesPerStudent: v.optional(v.number()),
    lastUpdated: v.optional(v.string()),
    pages: v.optional(v.any()),
  };

  const [exams, tasks, tags, fileTracker, users, groups, qrCodes] =
    await Promise.all([
      collection(mongoDb, 'exams', examSchema),
      collection(mongoDb, 'tasks', taskSchema),
      collection(mongoDb, 'tags', tagSchema),
      collection(mongoDb, 'fileTracker', fileTrackerSchema),
      collection(mongoDb, 'users', userSchema),
      collection(mongoDb, 'groups', groupSchema),
      collection(mongoDb, 'qrCodes', qrCodeSchema),
    ]);

  db = new ExamToolboxDatabase(client, {
    exams: exams as any,
    tasks: tasks as any,
    tags: tags as any,
    fileTracker: fileTracker as any,
    users: users as any,
    groups: groups as any,
    qrCodes: qrCodes as any,
  });
  return db;
}

export interface Collections {
  exams: any;
  tasks: any;
  tags: any;
  fileTracker: any;
  users: any;
  groups: any;
  qrCodes: any;
}

export class ExamToolboxDatabase {
  protected client: MongoClient;
  protected collections: Collections;

  constructor(client: MongoClient, collections: Collections) {
    this.client = client;
    this.collections = collections;
  }

  // Test
  test(): void {
    if (!this.client) {
      throw new Error('Failed to connect to MongoDB');
    }
  }

  public upsertUser = u.upsertUser;
  public updateUserLogin = u.updateUserLogin;
  public deactivateOtherUids = u.deactivateOtherUids;
  public getUserById = u.getUserById;
  public getAllUserStubs = u.getAllUserStubs;
  public getUsers = u.getUsers;
  public getGroups = u.getGroups;
  public upsertGroup = u.upsertGroup;

  public clearExams = e.clearExams;
  public createExam = e.createExam;
  public deleteExam = e.deleteExam;
  public getAllExams = e.getAllExams;
  public getExamById = e.getExamById;
  public getRecentExams = e.getRecentExams;
  public searchExams = e.searchExams;
  public updateExam = e.updateExam;

  public addChildTask = t.addChildTask;
  public clearTasks = t.clearTasks;
  public createTask = t.createTask;
  public deleteTask = t.deleteTask;
  public getAllTasks = t.getAllTasks;
  public getTaskById = t.getTaskById;
  public getTasksByTag = t.getTasksByTag;
  public getTasksByType = t.getTasksByType;
  public getTasksByUser = t.getTasksByUser;
  public removeTagFromTasks = t.removeTagFromTasks;
  public searchTasks = t.searchTasks;
  public updateTask = t.updateTask;
  public upsertTasks = t.upsertTasks;

  public getQRCache = q.getQRCache;
  public setQRCache = q.setQRCache;

  public addFileRef = f.addFileRef;
  public clearFileTracker = f.clearFileTracker;
  public createFileTrackerEntry = f.createFileTrackerEntry;

  public clearTags = g.clearTags;
  public createTag = g.createTag;
  public deleteTag = g.deleteTag;
  public getAllTags = g.getAllTags;
  public getTagById = g.getTagById;
  public updateTag = g.updateTag;
}
