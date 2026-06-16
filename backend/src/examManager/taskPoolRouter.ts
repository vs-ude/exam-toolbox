import { Router } from "@oak/oak";
import { parseTask, type Task } from "../types/exam.ts";
import { emptyDir } from "@std/fs";
import { ExamToolboxDatabase } from "../services/db.ts";

interface AppState {
  db: ExamToolboxDatabase;
  basePath: string;
}

export function configureTaskPoolRouter({
  db,
}: AppState): Router {
  const router = new Router({ prefix: "/api" });

  router
    .get("/taskPool", async (ctx) => {
      try {
        const taskList = await db.getAllTasks();
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
        const task = await db.getTaskById(taskId);
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
        const taskList = await db.getTasksByType(taskType);
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
        const taskList = await db.searchTasks(questionText);
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

        const result = await db.addChildTask(id, childTaskId);

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
        const taskList = await db.getTasksByUser(userId);
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks by user", error };
      }
    })
    .post("/taskPool", async (ctx) => {
      const task = parseTask(await ctx.request.body.json());
      try {
        await db.createTask(task);
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
        for (const fileURL of fileURLs) {
          const fileName = fileURL.split("/").pop() ?? "";
          try {
            await db.addFileRef(fileName, task.taskId);
          } catch (error) {
            console.error("Error fetching file tracker entry:", error);
          }
        }
      }
    })
    .put("/taskPool/:taskId", async (ctx) => {
      try {
        const id = ctx.params.taskId;
        const { _id, ...updateData } = await ctx.request.body.json();
        const task = parseTask(updateData);
        const result = await db.updateTask(id, task);

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
        const result = await db.deleteTask(ctx.params.taskId);
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
        const result = await db.clearTaskPool();
        await db.clearFileTracker();
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
        const taskList = await db.getTasksByTag(tagId);
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks for tag", error };
      }
    });
  return router;
}
