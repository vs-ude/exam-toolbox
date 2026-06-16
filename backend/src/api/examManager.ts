import { Router } from "@oak/oak";

import * as h from "../examManager/main.ts";

import { handle, rc } from "./helpers.ts";

export function configureExamManagerRouter(deps: h.ExamManagerDeps): Router {
  const router = new Router({ prefix: "/api" });

  router
    // Exams
    .get("/exams", (ctx) => handle(rc(ctx), () => h.getAllExams(rc(ctx), deps)))
    .get(
      "/exams/recent",
      (ctx) => handle(rc(ctx), () => h.getRecentExams(rc(ctx), deps)),
    )
    .get(
      "/exams/search/:searchText",
      (ctx) => handle(rc(ctx), () => h.searchExams(rc(ctx), deps)),
    )
    .get(
      "/exam/:id",
      (ctx) => handle(rc(ctx), () => h.getExamById(rc(ctx), deps)),
    )
    .post("/exams", (ctx) => handle(rc(ctx), () => h.createExam(rc(ctx), deps)))
    .put(
      "/exams/update",
      (ctx) => handle(rc(ctx), () => h.updateExam(rc(ctx), deps)),
    )
    .delete(
      "/exams",
      (ctx) => handle(rc(ctx), () => h.clearExams(rc(ctx), deps)),
    )
    .delete(
      "/exams/:examId",
      (ctx) => handle(rc(ctx), () => h.deleteExam(rc(ctx), deps)),
    )
    // File
    .get(
      "/download",
      (ctx) => handle(rc(ctx), () => h.downloadFile(rc(ctx), deps)),
    )
    .post(
      "/upload",
      (ctx) => handle(rc(ctx), () => h.uploadFile(rc(ctx), deps)),
    )
    // Exam generation
    .post(
      "/generate-exam",
      (ctx) => handle(rc(ctx), () => h.generateExam(rc(ctx), deps)),
    )
    .post(
      "/generate-exams",
      (ctx) => handle(rc(ctx), () => h.generateExams(rc(ctx), deps)),
    )
    // Jobs
    .get(
      "/jobs/downloadable",
      (ctx) => handle(rc(ctx), () => h.getDownloadableJobs(rc(ctx), deps)),
    )
    .get(
      "/jobs/:jobId/status",
      (ctx) => handle(rc(ctx), () => h.getJobStatus(rc(ctx), deps)),
    )
    .get(
      "/jobs/:jobId/download",
      (ctx) => handle(rc(ctx), () => h.downloadJob(rc(ctx), deps)),
    )
    .delete(
      "/jobs/:jobId",
      (ctx) => handle(rc(ctx), () => h.cancelJob(rc(ctx), deps)),
    )
    .get(
      "/exams/:examId/active-job",
      (ctx) => handle(rc(ctx), () => h.getActiveJob(rc(ctx), deps)),
    )
    // Task pool
    .get(
      "/taskPool",
      (ctx) => handle(rc(ctx), () => h.getAllTasks(rc(ctx), deps)),
    )
    .get(
      "/taskPool/tags/:tagId",
      (ctx) => handle(rc(ctx), () => h.getTasksByTag(rc(ctx), deps)),
    )
    .get(
      "/taskPool/type/:type",
      (ctx) => handle(rc(ctx), () => h.getTasksByType(rc(ctx), deps)),
    )
    .get(
      "/taskPool/search/:questionText",
      (ctx) => handle(rc(ctx), () => h.searchTasks(rc(ctx), deps)),
    )
    .get(
      "/taskPool/user/:userId",
      (ctx) => handle(rc(ctx), () => h.getTasksByUser(rc(ctx), deps)),
    )
    .get(
      "/taskPool/:taskId",
      (ctx) => handle(rc(ctx), () => h.getTaskById(rc(ctx), deps)),
    )
    .post(
      "/taskPool",
      (ctx) => handle(rc(ctx), () => h.createTask(rc(ctx), deps)),
    )
    .put(
      "/taskPool/addChild/:taskId",
      (ctx) => handle(rc(ctx), () => h.addChildTask(rc(ctx), deps)),
    )
    .put(
      "/taskPool/:taskId",
      (ctx) => handle(rc(ctx), () => h.updateTask(rc(ctx), deps)),
    )
    .delete(
      "/taskPool/:taskId",
      (ctx) => handle(rc(ctx), () => h.deleteTask(rc(ctx), deps)),
    )
    .delete(
      "/taskPool",
      (ctx) => handle(rc(ctx), () => h.clearTaskPool(rc(ctx), deps)),
    )
    // Tags
    .get("/tags", (ctx) => handle(rc(ctx), () => h.getAllTags(rc(ctx), deps)))
    .get(
      "/tags/:id",
      (ctx) => handle(rc(ctx), () => h.getTagById(rc(ctx), deps)),
    )
    .post("/tags", (ctx) => handle(rc(ctx), () => h.createTag(rc(ctx), deps)))
    .put(
      "/tags/:id",
      (ctx) => handle(rc(ctx), () => h.updateTag(rc(ctx), deps)),
    )
    .delete("/tags", (ctx) => handle(rc(ctx), () => h.clearTags(rc(ctx), deps)))
    .delete(
      "/tags/:id",
      (ctx) => handle(rc(ctx), () => h.deleteTag(rc(ctx), deps)),
    );

  return router;
}
