import { ObjectId } from "@db/mongo";
import { RouterContext } from "@oak/oak";

import { HandlerResult, HttpError } from "../types/handler.ts";
import { Tag } from "../types/tag.ts";

import { ExamManagerDeps } from "./main.ts";

export async function getTagById(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const tagId = ctx.params.id;
  const tag = await deps.db.getTagById(tagId);
  if (!tag) throw new HttpError(404, "Tag not found");
  return { kind: "json", status: 200, body: tag };
}

export async function getAllTags(
  _ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const tagList = await deps.db.getAllTags();
  return { kind: "json", status: 200, body: tagList };
}

export async function updateTag(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const tagId = ctx.params.id;
  const { _id, ...updatedTag }: Tag = await ctx.request.body.json();
  const result = await deps.db.updateTag(tagId, updatedTag);
  if (result.matchedCount === 0) throw new HttpError(404, "Tag not found");
  return {
    kind: "json",
    status: 200,
    body: { message: "Tag updated successfully" },
  };
}

export async function createTag(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const { _id, ...tag }: Tag = await ctx.request.body.json();
  const result = await deps.db.createTag(tag);
  return {
    kind: "json",
    status: 201,
    body: { message: "Tag saved successfully!", insertedId: result },
  };
}

export async function clearTags(
  _ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const result = await deps.db.clearTags();
  return {
    kind: "json",
    status: 200,
    body: {
      message: `${result} tags deleted successfully!`,
      deletedCount: result,
    },
  };
}

export async function deleteTag(
  ctx: RouterContext<string>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const tagId = ctx.params.id;
  if (!ObjectId.isValid(tagId)) throw new HttpError(400, "Invalid tag ID");
  const result = await deps.db.deleteTag(tagId);
  if (result === 0) throw new HttpError(404, "Tag not found");
  await deps.db.removeTagFromTasks(tagId);
  return {
    kind: "json",
    status: 200,
    body: { message: "Tag deleted successfully" },
  };
}
