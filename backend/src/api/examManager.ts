import { Hono } from "@hono/hono";

import * as h from "../examManager/main.ts";
import { AppEnv } from "../types/context.ts";
import { handle } from "./helpers.ts";

export function configureExamManagerRouter(
  deps: h.ExamManagerDeps,
): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router
    // Exams
    .get("/exams", (c) => handle(c, () => h.getAllExams(c, deps)))
    .get("/exams/recent", (c) => handle(c, () => h.getRecentExams(c, deps)))
    .get(
      "/exams/search/:searchText",
      (c) => handle(c, () => h.searchExams(c, deps)),
    )
    .get("/exam/:id", (c) => handle(c, () => h.getExamById(c, deps)))
    .post("/exams", (c) => handle(c, () => h.createExam(c, deps)))
    .put("/exams/update", (c) => handle(c, () => h.updateExam(c, deps)))
    .delete("/exams", (c) => handle(c, () => h.clearExams(c, deps)))
    .delete("/exams/:examId", (c) => handle(c, () => h.deleteExam(c, deps)))
    // File
    .get("/download", (c) => handle(c, () => h.downloadFile(c, deps)))
    .post("/upload", (c) => handle(c, () => h.uploadFile(c, deps)))
    // Exam generation
    .post("/generate-exam", (c) => handle(c, () => h.generateExam(c, deps)))
    .post("/generate-exams", (c) => handle(c, () => h.generateExams(c, deps)))
    // Jobs
    .get(
      "/jobs/downloadable",
      (c) => handle(c, () => h.getDownloadableJobs(c, deps)),
    )
    .get("/jobs/:jobId/status", (c) => handle(c, () => h.getJobStatus(c, deps)))
    .get(
      "/jobs/:jobId/download",
      (c) => handle(c, () => h.downloadJob(c, deps)),
    )
    .delete("/jobs/:jobId", (c) => handle(c, () => h.cancelJob(c, deps)))
    .get(
      "/exams/:examId/active-job",
      (c) => handle(c, () => h.getActiveJob(c, deps)),
    )
    // Task pool
    .get("/taskPool", (c) => handle(c, () => h.getAllTasks(c, deps)))
    .get(
      "/taskPool/tags/:tagId",
      (c) => handle(c, () => h.getTasksByTag(c, deps)),
    )
    .get(
      "/taskPool/type/:type",
      (c) => handle(c, () => h.getTasksByType(c, deps)),
    )
    .get(
      "/taskPool/search/:questionText",
      (c) => handle(c, () => h.searchTasks(c, deps)),
    )
    .get(
      "/taskPool/user/:userId",
      (c) => handle(c, () => h.getTasksByUser(c, deps)),
    )
    .get("/taskPool/:taskId", (c) => handle(c, () => h.getTaskById(c, deps)))
    .post("/taskPool", (c) => handle(c, () => h.createTask(c, deps)))
    .put(
      "/taskPool/addChild/:taskId",
      (c) => handle(c, () => h.addChildTask(c, deps)),
    )
    .put("/taskPool/:taskId", (c) => handle(c, () => h.updateTask(c, deps)))
    .delete("/taskPool/:taskId", (c) => handle(c, () => h.deleteTask(c, deps)))
    .delete("/taskPool", (c) => handle(c, () => h.clearTaskPool(c, deps)))
    // Tags
    .get("/tags", (c) => handle(c, () => h.getAllTags(c, deps)))
    .get("/tags/:id", (c) => handle(c, () => h.getTagById(c, deps)))
    .post("/tags", (c) => handle(c, () => h.createTag(c, deps)))
    .put("/tags/:id", (c) => handle(c, () => h.updateTag(c, deps)))
    .delete("/tags", (c) => handle(c, () => h.clearTags(c, deps)))
    .delete("/tags/:id", (c) => handle(c, () => h.deleteTag(c, deps)));

  return router;
}
