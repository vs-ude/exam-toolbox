import { Router } from "@oak/oak";
import { Database } from "@db/mongo";
import { crypto } from "@std/crypto";
import { encodeHex } from "@std/encoding";
import { Exam, Task } from "./exam.ts";
import { emptyDir } from "@std/fs";

interface AppState {
  db: Database;
  basePath: string;
}

export function configureTaskPoolRouter({
  db,
}: AppState): Router {
  const router = new Router({ prefix: "/api" });

  const pool = db.collection("taskPool");
  const fileTracker = db.collection("fileTracker");

  router
    .get("/taskPool", async (ctx) => {
      try {
        const taskList = await pool.find().toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks", error };
      }
    })
    .get("/taskPool/:taskId", async (ctx) => {
      try {
        const taskId = ctx.params.taskId;
        const task = await pool.findOne({ taskId: taskId });
        if (!task) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Task not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = task;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching task", error };
      }
    })
    .get("/taskPool/type/:type", async (ctx) => {
      const taskType = ctx.params.type;
      try {
        const taskList = await pool.find({ type: taskType }).toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks by type", error };
      }
    })
    .get("/taskPool/search/:questionText", async (ctx) => {
      try {
        const questionText = ctx.params.questionText;
        const taskList = await pool
          .find({
            $or: [
              { "question.DE": { $regex: questionText, $options: "i" } },
              { "question.EN": { $regex: questionText, $options: "i" } },
            ],
          })
          .toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Error fetching tasks by question text",
          error,
        };
      }
    })
    .put("/taskPool/addChild/:taskId", async (ctx) => {
      try {
        const id = ctx.params.taskId;
        const { childTaskId } = await ctx.request.body.json();

        const result = await pool.updateOne(
          { taskId: id },
          { $addToSet: { children: childTaskId } },
        );

        if (result.matchedCount === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Task not found" };
          return;
        }
        ctx.response.status = 200;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          message: `Error updating child tasks for ${ctx.params.taskId}`,
          error,
        };
      }
    })
    .get("/taskPool/user/:userId", async (ctx) => {
      const userId = ctx.params.userId;
      try {
        const taskList = await pool.find({ createdBy: userId }).toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks by user", error };
      }
    })
    .post("/taskPool", async (ctx) => {
      const task: Task = await ctx.request.body.json();
      try {
        await pool.insertOne(task);
        ctx.response.status = 200;
        ctx.response.body = { message: "Task added to pool" };
      } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error adding to pool", error: err };
      }
      if (task.type === "pictureTask") {
        const fileURLs = [
          task.questionPicture.urlDE,
          task.questionPicture.urlEN,
          task.solutionPicture.urlDE,
          task.solutionPicture.urlEN,
        ];
        console.log("File URLs: ", fileURLs);
        for (const fileURL of fileURLs) {
          const fileName = fileURL.split("/").pop();
          try {
            await fileTracker.updateOne(
              { name: fileName },
              { $addToSet: { refs: task.taskId } },
            );
          } catch (error) {
            console.error("Error fetching file tracker enttry:", error);
          }
        }
      }
    })
    .put("/taskPool/:taskId", async (ctx) => {
      try {
        const id = ctx.params.taskId;
        const { _id, ...updateData } = await ctx.request.body.json();

        const result = await pool.updateOne(
          { taskId: id },
          { $set: updateData },
        );

        if (result.matchedCount === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Task not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = {
          message: `Task ${ctx.params.taskId} updated successfully`,
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          message: `Error updating task ${ctx.params.taskId}`,
          error,
        };
      }
    })
    .delete("/taskPool/:taskId", async (ctx) => {
      try {
        const result = await pool.deleteOne({ taskId: ctx.params.taskId });
        if (result === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Task not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = { message: "Task deleted successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting task", error };
      }
    })
    .delete("/taskPool", async (ctx) => {
      try {
        const result = await pool.deleteMany({});
        await fileTracker.deleteMany({});
        await emptyDir("./uploads");
        ctx.response.status = 200;
        ctx.response.body = {
          message: `${result} task-pool deleted successfully!`,
          deletedCount: result,
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting task-pool", error };
      }
    })
    .get("/taskPool/tags/:tagId", async (ctx) => {
      const tagId = ctx.params.tagId;
      try {
        const taskList = await pool.find({ tagIds: tagId }).toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks for tag", error };
      }
    });
  return router;
}
