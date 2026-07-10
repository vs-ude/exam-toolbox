// deno-lint-ignore-file no-explicit-any
import {
  MongoClient,
  collection,
  dbId,
  newId,
  withIndex,
} from '@diister/mongodbee';
import * as v from '@diister/mongodbee/schema';
import { getConfig } from '../../config/appConfig.ts';
import { Exam, parseExam, parseTask, Task } from '../../types/mod.ts';
import { Group, User, UserStub } from '../../types/mod.ts';

let db: ExamToolboxDatabase;

export async function getOrCreateDb(): Promise<ExamToolboxDatabase> {
  if (db) return db;

  const connString = getConfig().db.connString;
  const client = new MongoClient(connString);
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

  const [exams, taskPool, tags, fileTracker, users, groups, qrCodes] =
    await Promise.all([
      collection(mongoDb, 'exams', examSchema),
      collection(mongoDb, 'taskPool', taskSchema),
      collection(mongoDb, 'tags', tagSchema),
      collection(mongoDb, 'fileTracker', fileTrackerSchema),
      collection(mongoDb, 'users', userSchema),
      collection(mongoDb, 'groups', groupSchema),
      collection(mongoDb, 'qrCodes', qrCodeSchema),
    ]);

  db = new ExamToolboxDatabase(client, {
    exams: exams as any,
    taskPool: taskPool as any,
    tags: tags as any,
    fileTracker: fileTracker as any,
    users: users as any,
    groups: groups as any,
    qrCodes: qrCodes as any,
  });
  return db;
}

interface Collections {
  exams: any;
  taskPool: any;
  tags: any;
  fileTracker: any;
  users: any;
  groups: any;
  qrCodes: any;
}

export class ExamToolboxDatabase {
  private client: MongoClient;
  private collections: Collections;

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

  // ── Exams ────────────────────────────────────────────────────────────────

  async getAllExams(): Promise<Exam[]> {
    return (await this.collections.exams.find({}).toArray()).map(parseExam);
  }

  async getRecentExams(user: User, limit: number): Promise<Exam[]> {
    return (
      await this.collections.exams
        .find({ lastEditedBy: user.sub }, { sort: { updatedAt: -1 }, limit })
        .toArray()
    ).map(parseExam);
  }

  async getExamById(id: string): Promise<Exam | undefined> {
    const doc = await this.collections.exams.findOne({ _id: id });
    return doc ? parseExam(doc) : undefined;
  }

  async searchExams(text: string): Promise<Exam[]> {
    return (
      await this.collections.exams
        .find({
          $or: [
            { courseName: { $regex: text, $options: 'i' } },
            { semester: { $regex: text, $options: 'i' } },
          ],
        })
        .toArray()
    ).map(parseExam);
  }

  async createExam(exam: Exam): Promise<string> {
    const id = await this.collections.exams.insertOne(exam);
    return String(id);
  }

  updateExam(id: string, data: Exam): Promise<{ matchedCount: number }> {
    return this.collections.exams.updateOne({ _id: id }, { $set: data });
  }

  async deleteExam(id: string): Promise<number> {
    const result = await this.collections.exams.deleteOne({ _id: id });
    return result.deletedCount;
  }

  async clearExams(): Promise<number> {
    const result = await this.collections.exams.deleteMany({});
    return result.deletedCount;
  }

  // ── FileTracker ──────────────────────────────────────────────────────────

  async createFileTrackerEntry(entry: Record<string, unknown>): Promise<void> {
    await this.collections.fileTracker.insertOne(entry);
  }

  async addFileRef(fileName: string, taskId: string): Promise<void> {
    await this.collections.fileTracker.updateOne(
      { name: fileName },
      { $addToSet: { refs: taskId } },
    );
  }

  async clearFileTracker(): Promise<void> {
    await this.collections.fileTracker.deleteMany({});
  }

  // ── Tags ─────────────────────────────────────────────────────────────────

  getAllTags(): Promise<Record<string, unknown>[]> {
    return this.collections.tags.find({}, { sort: { name: 1 } }).toArray();
  }

  getTagById(id: string): Promise<Record<string, unknown> | null> {
    return this.collections.tags.findOne({ _id: id });
  }

  async createTag(tag: Record<string, unknown>): Promise<string> {
    const id = await this.collections.tags.insertOne(tag);
    return String(id);
  }

  updateTag(
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ matchedCount: number }> {
    return this.collections.tags.updateOne({ _id: id }, { $set: data });
  }

  async deleteTag(id: string): Promise<number> {
    const result = await this.collections.tags.deleteOne({ _id: id });
    return result.deletedCount;
  }

  async clearTags(): Promise<number> {
    const result = await this.collections.tags.deleteMany({});
    return result.deletedCount;
  }

  // ── TaskPool ─────────────────────────────────────────────────────────────

  async getAllTasks(): Promise<Task[]> {
    return (await this.collections.taskPool.find({}).toArray()).map(parseTask);
  }

  async getTaskById(taskId: string): Promise<Task | undefined> {
    const doc = await this.collections.taskPool.findOne({ _id: taskId });
    return doc ? parseTask(doc) : undefined;
  }

  async getTasksByType(type: string): Promise<Task[]> {
    return (await this.collections.taskPool.find({ type }).toArray()).map(
      parseTask,
    );
  }

  async searchTasks(text: string): Promise<Task[]> {
    return (
      await this.collections.taskPool
        .find({
          $or: [
            { 'question.DE': { $regex: text, $options: 'i' } },
            { 'question.EN': { $regex: text, $options: 'i' } },
          ],
        })
        .toArray()
    ).map(parseTask);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return (
      await this.collections.taskPool.find({ createdBy: userId }).toArray()
    ).map(parseTask);
  }

  async getTasksByTag(tagId: string): Promise<Task[]> {
    return (
      await this.collections.taskPool.find({ tagIds: tagId }).toArray()
    ).map(parseTask);
  }

  async createTask(task: Task): Promise<string> {
    const id = await this.collections.taskPool.insertOne(task);
    return String(id);
  }

  updateTask(taskId: string, data: Task): Promise<{ matchedCount: number }> {
    return this.collections.taskPool.updateOne({ _id: taskId }, { $set: data });
  }

  addChildTask(
    taskId: string,
    childTaskId: string,
  ): Promise<{ matchedCount: number }> {
    return this.collections.taskPool.updateOne(
      { _id: taskId },
      { $addToSet: { children: childTaskId } },
    );
  }

  async deleteTask(taskId: string): Promise<number> {
    const result = await this.collections.taskPool.deleteOne({ _id: taskId });
    return result.deletedCount;
  }

  async clearTaskPool(): Promise<number> {
    const result = await this.collections.taskPool.deleteMany({});
    return result.deletedCount;
  }

  async removeTagFromTasks(tagId: string): Promise<void> {
    await this.collections.taskPool.updateMany(
      { tagIds: tagId },
      { $pull: { tagIds: tagId } },
    );
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async upsertUser(user: User): Promise<void> {
    const now = new Date();
    await this.collections.users.updateOne(
      { sub: user.sub },
      {
        $set: user,
        $setOnInsert: { _id: `user:${newId()}`, createdAt: now },
      },
      { upsert: true },
    );
  }

  async updateUserLogin(user: User): Promise<void> {
    const now = new Date();
    await this.collections.users.updateOne(
      { sub: user.sub },
      { $set: { lastLoginAt: now } },
    );
  }

  /**
   * Deactivates all users except those specified in the `uids` array.
   */
  async deactivateOtherUids(uids: string[]): Promise<void> {
    await this.collections.users.updateMany(
      { sub: { $nin: uids } },
      { $set: { active: false } },
    );
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await this.collections.users.findOne({ sub: id });
    return result as User | undefined;
  }

  async getAllUserStubs(): Promise<UserStub[]> {
    const results = await this.collections.users.find({}).toArray();
    return results.map((res: any) => {
      const { _id, ...rest } = res;
      void _id;
      return rest as UserStub;
    });
  }

  async getUsers(uids: string[]): Promise<User[]> {
    const results = await this.collections.users
      .find({ sub: { $in: uids } })
      .toArray();
    return results.map((res: any) => {
      const { _id, ...rest } = res;
      void _id;
      return rest as User;
    });
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  async upsertGroup(group: Group): Promise<void> {
    await this.collections.groups.updateOne(
      { name: group.name },
      { $set: group, $setOnInsert: { _id: `group:${newId()}` } },
      { upsert: true },
    );
  }

  async getGroups(): Promise<Group[]> {
    const results = await this.collections.groups.find({}).toArray();
    return results as unknown as Group[];
  }

  // ── QR Cache ─────────────────────────────────────────────────────────────

  async getQRCache(): Promise<QRCacheDocument> {
    return (await this.collections.qrCodes.findOne(
      {},
    )) as unknown as QRCacheDocument;
  }

  async setQRCache(updated: QRCacheDocument): Promise<void> {
    await this.collections.qrCodes.updateOne(
      {},
      { $set: updated },
      { upsert: true },
    );
  }
}

export type QRCacheDocument = {
  studentsPerLanguage: number;
  pagesPerStudent: number;
  lastUpdated: string;
};
