import { Collection, Database, Document, MongoClient } from "@db/mongo";
import { DB_CONNSTRING } from "../config/db.ts";

let db: ExamToolboxDatabase;

export async function getOrCreateDb(): Promise<ExamToolboxDatabase> {
  if (db) return db;

  const client = new MongoClient();
  await client.connect(DB_CONNSTRING);
  const dbConn = client.database(); // We assume a database name is provided in the connection string
  const collections: Collections = {} as Collections;
  collections.exams = dbConn.collection("exams");
  collections.qrCodes = dbConn.collection("qrCodes");
  db = new ExamToolboxDatabase(client, dbConn, collections);
  return db;
}

interface Collections {
  exams: Collection<Document>;
  qrCodes: Collection<Document>;
}

export class ExamToolboxDatabase {
  private client: MongoClient;
  private dbConn: Database;
  private collections: Collections = {} as Collections;
  constructor(
    client: MongoClient,
    dbConn: Database,
    collections: Collections,
  ) {
    this.client = client;
    this.dbConn = dbConn;
    this.collections = collections;
  }

  /** Workaround for now */
  getDBConn(): Database {
    return this.dbConn;
  }

  /** Workaround for now */
  getExams(): Collection<Document> {
    return this.collections.exams;
  }

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
