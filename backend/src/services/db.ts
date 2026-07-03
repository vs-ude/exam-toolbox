import { Collection, Document, MongoClient, ObjectId } from "@db/mongo";
import { getConfig } from "../config/appConfig.ts";
import { Exam, parseExam, parseTask, Task } from "../types/exam.ts";
import { Group, User } from "../types/user.ts";

let db: ExamToolboxDatabase;

export async function getOrCreateDb(): Promise<ExamToolboxDatabase> {
  if (db) return db;

  const client = new MongoClient();
  await client.connect(getConfig().db.connString);
  const dbConn = client.database(); // We assume a database name is provided in the connection string
  const collections: Collections = {} as Collections;
  collections.exams = dbConn.collection("exams");
  collections.qrCodes = dbConn.collection("qrCodes");
  collections.tags = dbConn.collection("tags");
  collections.taskPool = dbConn.collection("taskPool");
  collections.fileTracker = dbConn.collection("fileTracker");
  collections.users = dbConn.collection("users");
  collections.groups = dbConn.collection("groups");
  db = new ExamToolboxDatabase(client, collections);
  return db;
}

interface Collections {
  exams: Collection<Document>;
  qrCodes: Collection<Document>;
  tags: Collection<Document>;
  taskPool: Collection<Document>;
  fileTracker: Collection<Document>;
  users: Collection<Document>;
  groups: Collection<Document>;
}

export class ExamToolboxDatabase {
  private client: MongoClient;
  private collections: Collections = {} as Collections;
  constructor(
    client: MongoClient,
    collections: Collections,
  ) {
    this.client = client;
    this.collections = collections;
  }

  // Test
  test(): void {
    const info = this.client.buildInfo;
    if (info === undefined) {
      throw new Error("Failed to connect to MongoDB");
    }
  }

  // ── Exams ────────────────────────────────────────────────────────────────

  async getAllExams(): Promise<Exam[]> {
    return (await this.collections.exams.find().toArray()).map(parseExam);
  }

  async getRecentExams(userId: string, limit: number): Promise<Exam[]> {
    return (await this.collections.exams
      .find({ lastEditedBy: userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray()).map(parseExam);
  }

  async getExamById(id: string): Promise<Exam | undefined> {
    const doc = await this.collections.exams.findOne({ _id: new ObjectId(id) });
    return doc ? parseExam(doc) : undefined;
  }

  async searchExams(text: string): Promise<Exam[]> {
    return (await this.collections.exams
      .find({
        $or: [
          { courseName: { $regex: text, $options: "i" } },
          { semester: { $regex: text, $options: "i" } },
        ],
      })
      .toArray()).map(parseExam);
  }

  createExam(exam: Exam): Promise<ObjectId> {
    return this.collections.exams.insertOne(exam);
  }

  updateExam(
    id: string,
    data: Exam,
  ): Promise<{ matchedCount: number }> {
    return this.collections.exams.updateOne(
      { _id: new ObjectId(id) },
      { $set: data },
    );
  }

  deleteExam(id: string): Promise<number> {
    return this.collections.exams.deleteOne({ _id: new ObjectId(id) });
  }

  clearExams(): Promise<number> {
    return this.collections.exams.deleteMany({});
  }

  // ── FileTracker ──────────────────────────────────────────────────────────

  async createFileTrackerEntry(entry: Document): Promise<void> {
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

  getAllTags(): Promise<Document[]> {
    return this.collections.tags.find().sort({ name: 1 }).toArray();
  }

  getTagById(id: string): Promise<Document | undefined> {
    return this.collections.tags.findOne({ _id: new ObjectId(id) });
  }

  createTag(tag: Document): Promise<ObjectId> {
    return this.collections.tags.insertOne(tag);
  }

  updateTag(
    id: string,
    data: Document,
  ): Promise<{ matchedCount: number }> {
    return this.collections.tags.updateOne(
      { _id: new ObjectId(id) },
      { $set: data },
    );
  }

  deleteTag(id: string): Promise<number> {
    return this.collections.tags.deleteOne({ _id: new ObjectId(id) });
  }

  clearTags(): Promise<number> {
    return this.collections.tags.deleteMany({});
  }

  // ── TaskPool ─────────────────────────────────────────────────────────────

  async getAllTasks(): Promise<Task[]> {
    return (await this.collections.taskPool.find().toArray()).map(parseTask);
  }

  async getTaskById(taskId: string): Promise<Task | undefined> {
    const doc = await this.collections.taskPool.findOne({ taskId });
    return doc ? parseTask(doc) : undefined;
  }

  async getTasksByType(type: string): Promise<Task[]> {
    return (await this.collections.taskPool.find({ type }).toArray()).map(
      parseTask,
    );
  }

  async searchTasks(text: string): Promise<Task[]> {
    return (await this.collections.taskPool
      .find({
        $or: [
          { "question.DE": { $regex: text, $options: "i" } },
          { "question.EN": { $regex: text, $options: "i" } },
        ],
      })
      .toArray()).map(parseTask);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return (await this.collections.taskPool.find({ createdBy: userId })
      .toArray()).map(parseTask);
  }

  async getTasksByTag(tagId: string): Promise<Task[]> {
    return (await this.collections.taskPool.find({ tagIds: tagId }).toArray())
      .map(parseTask);
  }

  createTask(task: Task): Promise<unknown> {
    return this.collections.taskPool.insertOne(task);
  }

  updateTask(
    taskId: string,
    data: Task,
  ): Promise<{ matchedCount: number }> {
    return this.collections.taskPool.updateOne({ taskId }, { $set: data });
  }

  addChildTask(
    taskId: string,
    childTaskId: string,
  ): Promise<{ matchedCount: number }> {
    return this.collections.taskPool.updateOne(
      { taskId },
      { $addToSet: { children: childTaskId } },
    );
  }

  deleteTask(taskId: string): Promise<number> {
    return this.collections.taskPool.deleteOne({ taskId });
  }

  clearTaskPool(): Promise<number> {
    return this.collections.taskPool.deleteMany({});
  }

  async removeTagFromTasks(tagId: string): Promise<void> {
    const mongoId = new ObjectId(tagId);
    await this.collections.taskPool.updateMany(
      { tagIds: mongoId },
      { $pull: { tagIds: mongoId } },
    );
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async upsertUser(user: User): Promise<void> {
    const now = new Date();
    user.lastLoginAt = now;
    await this.collections.users.updateOne(
      { uid: user.uid },
      {
        $set: user,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  async getUsers(uids: string[]): Promise<User[]> {
    const results = await this.collections.users.find({ uid: { $in: uids } })
      .toArray();
    const users: User[] = results.map((res) => {
      delete res._id;
      return res as User;
    });
    return users;
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  async upsertGroup(group: Group): Promise<void> {
    await this.collections.groups.updateOne(
      { name: group.name },
      {
        $set: group,
      },
      { upsert: true },
    );
  }

  async getGroups(): Promise<Group[]> {
    const results = await this.collections.groups.find().toArray();
    const groups: Group[] = results.map((res) => res as Group);
    return groups;
  }

  // ── QR Cache ─────────────────────────────────────────────────────────────

  async getQRCache(): Promise<QRCacheDocument> {
    return (await this.collections.qrCodes.findOne()) as QRCacheDocument;
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
