import { ExamToolboxDatabase } from '../mod.ts';

export async function createFileTrackerEntry(
  this: ExamToolboxDatabase,
  entry: Record<string, unknown>,
): Promise<void> {
  await this.collections.fileTracker.insertOne(entry);
}

export async function addFileRef(
  this: ExamToolboxDatabase,
  fileName: string,
  taskId: string,
): Promise<void> {
  await this.collections.fileTracker.updateOne(
    { name: fileName },
    { $addToSet: { refs: taskId } },
  );
}

export async function clearFileTracker(
  this: ExamToolboxDatabase,
): Promise<void> {
  await this.collections.fileTracker.deleteMany({});
}
