import { Router } from "@oak/oak";
import { Database, ObjectId } from "@db/mongo";
import { Tag } from "./tag.ts";

interface AppState {
  db: Database;
}

export function configureTagRouter({ db }: AppState): Router {
  const router = new Router({ prefix: "/api" });
  const tags = db.collection("tags");
  const tasks = db.collection("taskPool");

  router
    .get("/tags/:id", async (ctx) => {
      try {
        const tagId = ctx.params.id;
        const mongoId = new ObjectId(tagId);
        const tag = await tags.findOne({ _id: mongoId });
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
        const tagList = await tags.find().sort({ name: 1 }).toArray();
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
        const mongoId = new ObjectId(tagId);
        const { _id, ...updatedTag }: Tag = await ctx.request.body.json();

        const result = await tags.updateOne({ _id: mongoId }, {
          $set: updatedTag,
        });

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
        const result = await tags.insertOne(tag);
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
        const result = await tags.deleteMany({});
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
        const mongoId = new ObjectId(tagId);
        const result = await tags.deleteOne({ _id: mongoId });

        if (result === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }

        // remove the deleted tag from all tasks that reference it
        await tasks.updateMany(
          { tagIds: mongoId },
          { $pull: { tagIds: mongoId } },
        );

        ctx.response.status = 200;
        ctx.response.body = { message: "Tag deleted successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting tag", error };
      }
    });

  return router;
}
