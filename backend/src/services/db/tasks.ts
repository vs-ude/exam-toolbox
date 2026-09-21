// deno-lint-ignore-file no-explicit-any
import { ExamToolboxDatabase } from '../mod.ts';
import { User, Task, parseTask } from '../../types/mod.ts';
import { newId } from '@diister/mongodbee';

export async function getAllTasks(this: ExamToolboxDatabase): Promise<Task[]> {
  return (await this.collections.tasks.find({}).toArray()).map(parseTask);
}

export async function getTaskById(
  this: ExamToolboxDatabase,
  taskId: string,
): Promise<Task | undefined> {
  const doc = await this.collections.tasks.findOne({ _id: taskId });
  return doc ? parseTask(doc) : undefined;
}

export async function getTasksByType(
  this: ExamToolboxDatabase,
  type: string,
): Promise<Task[]> {
  return (await this.collections.tasks.find({ type }).toArray()).map(parseTask);
}

export async function searchTasks(
  this: ExamToolboxDatabase,
  text: string,
): Promise<Task[]> {
  return (
    await this.collections.tasks
      .find({
        $or: [
          { 'question.A': { $regex: text, $options: 'i' } },
          { 'question.B': { $regex: text, $options: 'i' } },
        ],
      })
      .toArray()
  ).map(parseTask);
}

export async function getTasksByUser(
  this: ExamToolboxDatabase,
  userId: string,
): Promise<Task[]> {
  return (
    await this.collections.tasks.find({ createdBy: userId }).toArray()
  ).map(parseTask);
}

export async function getTasksByTag(
  this: ExamToolboxDatabase,
  tagId: string,
): Promise<Task[]> {
  return (await this.collections.tasks.find({ tagIds: tagId }).toArray()).map(
    parseTask,
  );
}

/**
 * Updates the given tasks. If a task has no _id, it is inserted instead.
 * It sets the createdAt and createdBy fields if necessary. It updates the lastUsed field.
 * It updates the usedIn list if necessary.
 * @param tasks The tasks to upsert.
 * @param reference The exam reference to set in the usedIn field.
 * @param user The user to set in the createdBy field.
 */
export async function upsertTasks(
  this: ExamToolboxDatabase,
  tasks: Task[],
  reference: string,
  user: User,
): Promise<void> {
  const now = new Date();
  for (const task of tasks) {
    // newPage tasks are layout markers only – they live exclusively in the exam document
    if (task.type === 'newPage') continue;

    if (!task._id) {
      // No ID → create a new task in the pool and wire it into the exam in-place
      const id = `task:${newId()}`;
      task._id = id;
      task.createdBy = task.createdBy || user.sub;
      (task as any).createdAt = (task as any).createdAt || now;
      task.lastUsed = now;
      task.usedIn = Array.isArray(task.usedIn) ? task.usedIn : [];
      if (!task.usedIn.includes(reference)) task.usedIn.push(reference);
      task.children = Array.isArray(task.children) ? task.children : [];
      task.tagIds = Array.isArray(task.tagIds) ? task.tagIds : [];
      await this.collections.tasks.insertOne({ ...task });
      // If this task was derived from an existing one, register it as a child
      if (task.parent) {
        await this.collections.tasks.updateOne(
          { _id: task.parent },
          { $addToSet: { children: id } },
        );
      }
    } else {
      // Has ID → update the existing pool task in-place.
      // usedIn is handled exclusively by $addToSet to avoid a path conflict
      // and to preserve references to other exams the task appears in.
      const { _id, usedIn: _usedIn, ...taskData } = task as any;
      void _id;
      void _usedIn;
      await this.collections.tasks.updateOne(
        { _id: task._id },
        {
          $set: { ...taskData, lastUsed: now },
          $addToSet: { usedIn: reference },
        },
      );
    }
  }
}

export async function createTask(
  this: ExamToolboxDatabase,
  task: Task,
): Promise<string> {
  const id = await this.collections.tasks.insertOne(task);
  return String(id);
}

export function updateTask(
  this: ExamToolboxDatabase,
  taskId: string,
  data: Task,
): Promise<{ matchedCount: number }> {
  return this.collections.tasks.updateOne({ _id: taskId }, { $set: data });
}

export function addChildTask(
  this: ExamToolboxDatabase,
  taskId: string,
  childTaskId: string,
): Promise<{ matchedCount: number }> {
  return this.collections.tasks.updateOne(
    { _id: taskId },
    { $addToSet: { children: childTaskId } },
  );
}

export async function deleteTask(
  this: ExamToolboxDatabase,
  taskId: string,
): Promise<number> {
  const result = await this.collections.tasks.deleteOne({ _id: taskId });
  return result.deletedCount;
}

export async function clearTasks(this: ExamToolboxDatabase): Promise<number> {
  const result = await this.collections.tasks.deleteMany({});
  return result.deletedCount;
}

export async function removeTagFromTasks(
  this: ExamToolboxDatabase,
  tagId: string,
): Promise<void> {
  await this.collections.tasks.updateMany(
    { tagIds: tagId },
    { $pull: { tagIds: tagId } },
  );
}
