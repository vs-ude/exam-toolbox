import { ExamToolboxDatabase } from './db.ts';

export function getAllTags(
  this: ExamToolboxDatabase,
): Promise<Record<string, unknown>[]> {
  return this.collections.tags.find({}, { sort: { name: 1 } }).toArray();
}

export function getTagById(
  this: ExamToolboxDatabase,
  id: string,
): Promise<Record<string, unknown> | null> {
  return this.collections.tags.findOne({ _id: id });
}

export async function createTag(
  this: ExamToolboxDatabase,
  tag: Record<string, unknown>,
): Promise<string> {
  const id = await this.collections.tags.insertOne(tag);
  return String(id);
}

export function updateTag(
  this: ExamToolboxDatabase,
  id: string,
  data: Record<string, unknown>,
): Promise<{ matchedCount: number }> {
  return this.collections.tags.updateOne({ _id: id }, { $set: data });
}

export async function deleteTag(
  this: ExamToolboxDatabase,
  id: string,
): Promise<number> {
  const result = await this.collections.tags.deleteOne({ _id: id });
  return result.deletedCount;
}

export async function clearTags(this: ExamToolboxDatabase): Promise<number> {
  const result = await this.collections.tags.deleteMany({});
  return result.deletedCount;
}
