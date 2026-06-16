import { Router } from "@oak/oak";
import { ObjectId } from "@db/mongo";
import { Tag } from "../types/tag.ts";
import { ExamToolboxDatabase } from "../services/db.ts";

interface AppState {
  db: ExamToolboxDatabase;
}

export function configureTagRouter({ db }: AppState): Router {
  const router = new Router({ prefix: "/api" });
  router
    .get("/tags/:id", async (ctx) => {
      try {
        const tagId = ctx.params.id;
        const tag = await db.getTagById(tagId);
        if (!tag) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = tag;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tag", error };
      }
    })
    .get("/tags", async (ctx) => {
      try {
        const tagList = await db.getAllTags();
        ctx.response.status = 200;
        ctx.response.body = tagList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tags", error };
      }
    })
    .put("/tags/:id", async (ctx) => {
      try {
        const tagId = ctx.params.id;
        const { _id, ...updatedTag }: Tag = await ctx.request.body.json();

        const result = await db.updateTag(tagId, updatedTag);

        if (result.matchedCount === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }

        ctx.response.status = 200;
        ctx.response.body = { message: "Tag updated successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error updating tag", error };
      }
    })
    .post("/tags", async (ctx) => {
      const { _id, ...tag }: Tag = await ctx.request.body.json();
      try {
        const result = await db.createTag(tag);
        ctx.response.status = 201;
        ctx.response.body = {
          message: "Tag saved successfully!",
          insertedId: result,
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error saving tag", error: error };
      }
    })
    .delete("/tags", async (ctx) => {
      try {
        const result = await db.clearTags();
        ctx.response.status = 200;
        ctx.response.body = {
          message: `${result} tags deleted successfully!`,
          deletedCount: result,
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting tags", error };
      }
    })
    .delete("/tags/:id", async (ctx) => {
      const tagId = ctx.params.id;

      if (!ObjectId.isValid(tagId)) {
        ctx.response.status = 400;
        ctx.response.body = { message: "Invalid tag ID" };
        return;
      }

      try {
        const result = await db.deleteTag(tagId);

        if (result === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }

        // remove the deleted tag from all tasks that reference it
        await db.removeTagFromTasks(tagId);

        ctx.response.status = 200;
        ctx.response.body = { message: "Tag deleted successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting tag", error };
      }
    });

  return router;
}
