import { ExamToolboxDatabase } from '../mod.ts';

export async function getQRCache(
  this: ExamToolboxDatabase,
): Promise<QRCacheDocument> {
  return (await this.collections.qrCodes.findOne(
    {},
  )) as unknown as QRCacheDocument;
}

export async function setQRCache(
  this: ExamToolboxDatabase,
  updated: QRCacheDocument,
): Promise<void> {
  await this.collections.qrCodes.updateOne(
    {},
    { $set: updated },
    { upsert: true },
  );
}

export type QRCacheDocument = {
  studentsPerLanguage: number;
  pagesPerStudent: number;
  lastUpdated: string;
};
