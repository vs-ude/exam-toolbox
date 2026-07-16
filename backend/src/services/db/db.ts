// deno-lint-ignore-file no-explicit-any
import { MongoClient, collection } from '@diister/mongodbee';
import { getConfig } from '../../config/appConfig.ts';

import * as s from './schemas.ts';

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
  const client = new MongoClient(connString);
  const host = new URL(connString).hostname;
  const adminDb = client.db('admin');
  try {
    const status = await adminDb.command({
      replSetGetStatus: { replicaSet: 'rs0' },
    });
    if (!status.ok) throw new Error('Replica set not initialized');
  } catch (_) {
    console.info('Initializing replica set for host', host);
    await adminDb.command({
      replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host }] },
    });
  }

  await client.connect();
  // Extract database name from the connection string path component
  const dbName = new URL(connString).pathname.slice(1);
  const mongoDb = client.db(dbName);

  const [exams, tasks, tags, fileTracker, users, groups, qrCodes] =
    await Promise.all([
      collection(mongoDb, 'exams', s.examSchema),
      collection(mongoDb, 'tasks', s.taskSchema),
      collection(mongoDb, 'tags', s.tagSchema),
      collection(mongoDb, 'fileTracker', s.fileTrackerSchema),
      collection(mongoDb, 'users', s.userSchema),
      collection(mongoDb, 'groups', s.groupSchema),
      collection(mongoDb, 'qrCodes', s.qrCodeSchema),
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
  async test(): Promise<void> {
    type Pong = { ok: number; $clusterTime: any };
    const pong = (await this.client.db().command({ ping: 1 })) as Pong;
    if (!pong.ok) {
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
  public getExamByIdInternal = e.getExamByIdInternal;
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
