import { RouterContext } from "@oak/oak";
import { emptyDir } from "@std/fs";

import { parseTask } from "../types/exam.ts";
import { HandlerResult, HttpError } from "../types/handler.ts";

import { ExamManagerDeps } from "./main.ts";

export async function getAllTasks(
  _ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  try {
    const taskList = await deps.db.getAllTasks();
    return { kind: "json", status: 200, body: taskList };
  } catch (e) {
    if (e instanceof Error) {
      return {
        kind: "json",
        status: 500,
        body: { name: e.name, message: e.message },
      };
    }
    throw e;
  }
}

export async function getTaskById(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const taskId = ctx.params.taskId;
  const task = await deps.db.getTaskById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found");
  }
  return { kind: "json", status: 200, body: task };
}

export async function getTasksByType(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const taskType = ctx.params.type;
  const taskList = await deps.db.getTasksByType(taskType);
  return { kind: "json", status: 200, body: taskList };
}

export async function searchTasks(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const questionText = ctx.params.questionText;
  const taskList = await deps.db.searchTasks(questionText);
  return { kind: "json", status: 200, body: taskList };
}

export async function addChildTask(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const id = ctx.params.taskId;
  const { childTaskId } = await ctx.request.body.json();
  const result = await deps.db.addChildTask(id, childTaskId);
  if (result.matchedCount === 0) {
    throw new HttpError(404, "Task not found");
  }
  return { kind: "json", status: 200, body: null };
}

export async function getTasksByUser(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const userId = ctx.params.userId;
  const taskList = await deps.db.getTasksByUser(userId);
  return { kind: "json", status: 200, body: taskList };
}

export async function createTask(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const task = parseTask(await ctx.request.body.json());
  await deps.db.createTask(task);
  if (task.type === "pictureTask") {
    const fileURLs = [
      task.questionPicture.urlDE,
      task.questionPicture.urlEN,
      task.solutionPicture.urlDE,
      task.solutionPicture.urlEN,
    ];
    for (const fileURL of fileURLs) {
      const fileName = fileURL.split("/").pop() ?? "";
      try {
        await deps.db.addFileRef(fileName, task.taskId);
      } catch (error) {
        console.error("Error fetching file tracker entry:", error);
      }
    }
  }
  return {
    kind: "json",
    status: 200,
    body: { message: "Task added to pool" },
  };
}

export async function updateTask(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const id = ctx.params.taskId;
  const { _id, ...updateData } = await ctx.request.body.json();
  const task = parseTask(updateData);
  const result = await deps.db.updateTask(id, task);
  if (result.matchedCount === 0) {
    throw new HttpError(404, "Task not found");
  }
  return {
    kind: "json",
    status: 200,
    body: { message: `Task ${ctx.params.taskId} updated successfully` },
  };
}

export async function deleteTask(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const result = await deps.db.deleteTask(ctx.params.taskId);
  if (result === 0) {
    throw new HttpError(404, "Task not found");
  }
  return {
    kind: "json",
    status: 200,
    body: { message: "Task deleted successfully" },
  };
}

export async function clearTaskPool(
  _ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const result = await deps.db.clearTaskPool();
  await deps.db.clearFileTracker();
  await emptyDir("./uploads");
  return {
    kind: "json",
    status: 200,
    body: {
      message: `${result} task-pool deleted successfully!`,
      deletedCount: result,
    },
  };
}

export async function getTasksByTag(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const tagId = ctx.params.tagId;
  const taskList = await deps.db.getTasksByTag(tagId);
  return { kind: "json", status: 200, body: taskList };
}
