import { Context } from '@hono/hono';
import { emptyDir } from '@std/fs';

import { parseTask } from '../types/mod.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';
import { AppEnv } from '../types/context.ts';

import { ExamManagerDeps } from './main.ts';

export async function getAllTasks(
  _c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  try {
    const taskList = await deps.db.getAllTasks();
    return { kind: 'json', status: 200, body: taskList };
  } catch (e) {
    if (e instanceof Error) {
      return {
        kind: 'json',
        status: 500,
        body: { name: e.name, message: e.message },
      };
    }
    throw e;
  }
}

export async function getTaskById(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const taskId = c.req.param('taskId')!;
  const task = await deps.db.getTaskById(taskId);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  return { kind: 'json', status: 200, body: task };
}

export async function getTasksByType(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const taskType = c.req.param('type')!;
  const taskList = await deps.db.getTasksByType(taskType);
  return { kind: 'json', status: 200, body: taskList };
}

export async function searchTasks(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const questionText = c.req.param('questionText')!;
  const taskList = await deps.db.searchTasks(questionText);
  return { kind: 'json', status: 200, body: taskList };
}

export async function addChildTask(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const id = c.req.param('taskId')!;
  const { childTaskId } = await c.req.json();
  const result = await deps.db.addChildTask(id, childTaskId);
  if (result.matchedCount === 0) {
    throw new HttpError(404, 'Task not found');
  }
  return { kind: 'json', status: 200, body: null };
}

export async function getTasksByUser(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const userId = c.req.param('userId')!;
  const taskList = await deps.db.getTasksByUser(userId);
  return { kind: 'json', status: 200, body: taskList };
}

export async function createTask(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const task = parseTask(await c.req.json());
  const insertedId = await deps.db.createTask(task);
  if (task.type === 'pictureTask') {
    const fileURLs = [
      task.questionPicture.urlDE,
      task.questionPicture.urlEN,
      task.solutionPicture.urlDE,
      task.solutionPicture.urlEN,
    ];
    for (const fileURL of fileURLs) {
      const fileName = fileURL.split('/').pop() ?? '';
      try {
        await deps.db.addFileRef(fileName, String(insertedId));
      } catch (error) {
        console.error('Error fetching file tracker entry:', error);
      }
    }
  }
  return {
    kind: 'json',
    status: 200,
    body: { _id: String(insertedId) },
  };
}

export async function updateTask(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const id = c.req.param('taskId')!;
  const { _id, ...updateData } = await c.req.json();
  const task = parseTask(updateData);
  const result = await deps.db.updateTask(id, task);
  if (result.matchedCount === 0) {
    throw new HttpError(404, 'Task not found');
  }
  return {
    kind: 'json',
    status: 200,
    body: { message: `Task ${c.req.param('taskId')!} updated successfully` },
  };
}

export async function deleteTask(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const result = await deps.db.deleteTask(c.req.param('taskId')!);
  if (result === 0) {
    throw new HttpError(404, 'Task not found');
  }
  return {
    kind: 'json',
    status: 200,
    body: { message: 'Task deleted successfully' },
  };
}

export async function clearTaskPool(
  _c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const result = await deps.db.clearTasks();
  await deps.db.clearFileTracker();
  await emptyDir('./uploads');
  return {
    kind: 'json',
    status: 200,
    body: {
      message: `${result} task-pool deleted successfully!`,
      deletedCount: result,
    },
  };
}

export async function getTasksByTag(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const tagId = c.req.param('tagId')!;
  const taskList = await deps.db.getTasksByTag(tagId);
  return { kind: 'json', status: 200, body: taskList };
}
