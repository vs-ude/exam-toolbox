import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import * as h from "../examManager/main.ts";
import { AppEnv } from "../types/context.ts";
import { handle } from "./helpers.ts";
import {
  ActiveJobSchema,
  DeleteResultSchema,
  DownloadableJobSchema,
  ErrorSchema,
  ExamSchema,
  ExamSummarySchema,
  InsertResultSchema,
  JobStatusSchema,
  MessageSchema,
  TagSchema,
  TaskSchema,
  UpdateExamBodySchema,
} from "./schemas.ts";

// All examManager routes require a Bearer JWT.
const BEARER: { Bearer: [] }[] = [{ Bearer: [] }];

// ── Shared param schemas ──────────────────────────────────────────────────────

const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const ExamIdParam = z.object({
  examId: z.string().openapi({ param: { name: "examId", in: "path" } }),
});
const JobIdParam = z.object({
  jobId: z.string().openapi({ param: { name: "jobId", in: "path" } }),
});
const TaskIdParam = z.object({
  taskId: z.string().openapi({ param: { name: "taskId", in: "path" } }),
});
const TagIdParam = z.object({
  tagId: z.string().openapi({ param: { name: "tagId", in: "path" } }),
});

// ── Route definitions – Exams ─────────────────────────────────────────────────

const getAllExamsRoute = createRoute({
  method: "get",
  path: "/exams",
  tags: ["Exams"],
  security: BEARER,
  summary: "List all exams",
  description: "Returns metadata for every exam stored in the database.",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(ExamSummarySchema) } },
      description: "Exam list",
    },
  },
});

const getRecentExamsRoute = createRoute({
  method: "get",
  path: "/exams/recent",
  tags: ["Exams"],
  security: BEARER,
  summary: "Recent exams",
  description:
    "Returns the 8 most recently edited exams for the authenticated user.",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(ExamSummarySchema) } },
      description: "Recent exams",
    },
  },
});

const searchExamsRoute = createRoute({
  method: "get",
  path: "/exams/search/{searchText}",
  tags: ["Exams"],
  security: BEARER,
  summary: "Search exams",
  description: "Full-text search across exam metadata.",
  request: {
    params: z.object({
      searchText: z.string().openapi({
        param: { name: "searchText", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(ExamSummarySchema) } },
      description: "Matching exams",
    },
  },
});

const getExamByIdRoute = createRoute({
  method: "get",
  path: "/exam/{id}",
  tags: ["Exams"],
  security: BEARER,
  summary: "Get exam by ID",
  description: "Returns the full exam document including all task groups.",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: ExamSchema } },
      description: "Exam document",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createExamRoute = createRoute({
  method: "post",
  path: "/exams",
  tags: ["Exams"],
  security: BEARER,
  summary: "Create exam",
  description:
    "Persists a new exam. The `lastEditedBy` field is set from the JWT.",
  request: {
    body: {
      content: { "application/json": { schema: ExamSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: InsertResultSchema } },
      description: "Created",
    },
  },
});

const updateExamRoute = createRoute({
  method: "put",
  path: "/exams/update",
  tags: ["Exams"],
  security: BEARER,
  summary: "Update exam",
  description:
    "Replaces the exam document identified by `examId` with `updatedExam`.",
  request: {
    body: {
      content: { "application/json": { schema: UpdateExamBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing fields",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const clearExamsRoute = createRoute({
  method: "delete",
  path: "/exams",
  tags: ["Exams"],
  security: BEARER,
  summary: "Delete all exams",
  description:
    "Removes every exam from the database. Intended for development/testing only.",
  responses: {
    200: {
      content: { "application/json": { schema: DeleteResultSchema } },
      description: "All exams deleted",
    },
  },
});

const deleteExamRoute = createRoute({
  method: "delete",
  path: "/exams/{examId}",
  tags: ["Exams"],
  security: BEARER,
  summary: "Delete exam",
  description: "Deletes a single exam by ID.",
  request: { params: ExamIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// ── Route definitions – Jobs ──────────────────────────────────────────────────

const getDownloadableJobsRoute = createRoute({
  method: "get",
  path: "/jobs/downloadable",
  tags: ["Jobs"],
  security: BEARER,
  summary: "List downloadable jobs",
  description:
    "Returns all completed generation jobs that have a downloadable ZIP artifact.",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(DownloadableJobSchema) },
      },
      description: "Downloadable jobs",
    },
  },
});

const getJobStatusRoute = createRoute({
  method: "get",
  path: "/jobs/{jobId}/status",
  tags: ["Jobs"],
  security: BEARER,
  summary: "Get job status",
  description: "Returns the current status and progress of a generation job.",
  request: { params: JobIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: JobStatusSchema } },
      description: "Job status",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Job not found",
    },
  },
});

const cancelJobRoute = createRoute({
  method: "delete",
  path: "/jobs/{jobId}",
  tags: ["Jobs"],
  security: BEARER,
  summary: "Cancel job",
  description:
    "Cancels a queued or in-progress generation job and cleans up its working directory.",
  request: { params: JobIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Cancelled",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Job cannot be cancelled",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Job not found",
    },
  },
});

const getActiveJobRoute = createRoute({
  method: "get",
  path: "/exams/{examId}/active-job",
  tags: ["Jobs"],
  security: BEARER,
  summary: "Get active job for exam",
  description:
    "Returns the active (queued/processing/finalizing) generation job for the given exam, or null.",
  request: { params: ExamIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: ActiveJobSchema } },
      description: "Active job or null",
    },
  },
});

// ── Route definitions – Task pool ─────────────────────────────────────────────

const getAllTasksRoute = createRoute({
  method: "get",
  path: "/taskPool",
  tags: ["Tasks"],
  security: BEARER,
  summary: "List all tasks",
  description: "Returns all tasks in the pool.",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TaskSchema) } },
      description: "Task list",
    },
  },
});

const getTasksByTagRoute = createRoute({
  method: "get",
  path: "/taskPool/tags/{tagId}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Tasks by tag",
  description: "Returns tasks that have the given tag assigned.",
  request: { params: TagIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TaskSchema) } },
      description: "Matching tasks",
    },
  },
});

const getTasksByTypeRoute = createRoute({
  method: "get",
  path: "/taskPool/type/{type}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Tasks by type",
  description:
    "Returns tasks of the specified type (e.g. multipleChoice, shortAnswer).",
  request: {
    params: z.object({
      type: z.string().openapi({
        param: { name: "type", in: "path" },
        description: "Task type discriminant",
        example: "multipleChoice",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TaskSchema) } },
      description: "Matching tasks",
    },
  },
});

const searchTasksRoute = createRoute({
  method: "get",
  path: "/taskPool/search/{questionText}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Search tasks",
  description: "Full-text search on task question text.",
  request: {
    params: z.object({
      questionText: z.string().openapi({
        param: { name: "questionText", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TaskSchema) } },
      description: "Matching tasks",
    },
  },
});

const getTasksByUserRoute = createRoute({
  method: "get",
  path: "/taskPool/user/{userId}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Tasks by creator",
  description: "Returns tasks created by the specified user.",
  request: {
    params: z.object({
      userId: z.string().openapi({ param: { name: "userId", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TaskSchema) } },
      description: "Tasks by user",
    },
  },
});

const getTaskByIdRoute = createRoute({
  method: "get",
  path: "/taskPool/{taskId}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Get task by ID",
  request: { params: TaskIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: TaskSchema } },
      description: "Task document",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createTaskRoute = createRoute({
  method: "post",
  path: "/taskPool",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Create task",
  description: "Adds a new task to the pool.",
  request: {
    body: {
      content: { "application/json": { schema: TaskSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: InsertResultSchema } },
      description: "Created",
    },
  },
});

const addChildTaskRoute = createRoute({
  method: "put",
  path: "/taskPool/addChild/{taskId}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Add child task",
  description:
    "Creates a child variant of an existing task and links it to the parent.",
  request: {
    params: TaskIdParam,
    body: {
      content: { "application/json": { schema: TaskSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Child task added",
    },
  },
});

const updateTaskRoute = createRoute({
  method: "put",
  path: "/taskPool/{taskId}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Update task",
  request: {
    params: TaskIdParam,
    body: {
      content: { "application/json": { schema: TaskSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteTaskRoute = createRoute({
  method: "delete",
  path: "/taskPool/{taskId}",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Delete task",
  request: { params: TaskIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const clearTaskPoolRoute = createRoute({
  method: "delete",
  path: "/taskPool",
  tags: ["Tasks"],
  security: BEARER,
  summary: "Clear task pool",
  description:
    "Removes all tasks from the pool. Intended for development/testing only.",
  responses: {
    200: {
      content: { "application/json": { schema: DeleteResultSchema } },
      description: "All tasks deleted",
    },
  },
});

// ── Route definitions – Tags ──────────────────────────────────────────────────

const getAllTagsRoute = createRoute({
  method: "get",
  path: "/tags",
  tags: ["Tags"],
  security: BEARER,
  summary: "List all tags",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TagSchema) } },
      description: "Tag list",
    },
  },
});

const getTagByIdRoute = createRoute({
  method: "get",
  path: "/tags/{id}",
  tags: ["Tags"],
  security: BEARER,
  summary: "Get tag by ID",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: TagSchema } },
      description: "Tag document",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createTagRoute = createRoute({
  method: "post",
  path: "/tags",
  tags: ["Tags"],
  security: BEARER,
  summary: "Create tag",
  request: {
    body: {
      content: { "application/json": { schema: TagSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: InsertResultSchema } },
      description: "Created",
    },
  },
});

const updateTagRoute = createRoute({
  method: "put",
  path: "/tags/{id}",
  tags: ["Tags"],
  security: BEARER,
  summary: "Update tag",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: TagSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const clearTagsRoute = createRoute({
  method: "delete",
  path: "/tags",
  tags: ["Tags"],
  security: BEARER,
  summary: "Clear all tags",
  description: "Removes all tags. Intended for development/testing only.",
  responses: {
    200: {
      content: { "application/json": { schema: DeleteResultSchema } },
      description: "All tags deleted",
    },
  },
});

const deleteTagRoute = createRoute({
  method: "delete",
  path: "/tags/{id}",
  tags: ["Tags"],
  security: BEARER,
  summary: "Delete tag",
  description:
    "Deletes the tag and removes it from all tasks that reference it.",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Deleted",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid ID",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// ── Router ────────────────────────────────────────────────────────────────────

export function configureExamManagerRouter(
  deps: h.ExamManagerDeps,
): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  // Exams
  router.openapi(
    getAllExamsRoute,
    (c) => handle(c, () => h.getAllExams(c, deps)),
  );
  router.openapi(
    getRecentExamsRoute,
    (c) => handle(c, () => h.getRecentExams(c, deps)),
  );
  router.openapi(
    searchExamsRoute,
    (c) => handle(c, () => h.searchExams(c, deps)),
  );
  router.openapi(
    getExamByIdRoute,
    (c) => handle(c, () => h.getExamById(c, deps)),
  );
  router.openapi(
    createExamRoute,
    (c) => handle(c, () => h.createExam(c, deps)),
  );
  router.openapi(
    updateExamRoute,
    (c) => handle(c, () => h.updateExam(c, deps)),
  );
  router.openapi(
    clearExamsRoute,
    (c) => handle(c, () => h.clearExams(c, deps)),
  );
  router.openapi(
    deleteExamRoute,
    (c) => handle(c, () => h.deleteExam(c, deps)),
  );
  // Files – binary responses, not suitable for JSON schema validation
  router.get("/download", (c) => handle(c, () => h.downloadFile(c, deps)));
  router.post("/upload", (c) => handle(c, () => h.uploadFile(c, deps)));
  // Exam generation – multipart or binary responses
  router.post(
    "/generate-exam",
    (c) => handle(c, () => h.generateExam(c, deps)),
  );
  router.post(
    "/generate-exams",
    (c) => handle(c, () => h.generateExams(c, deps)),
  );
  // Jobs
  router.openapi(
    getDownloadableJobsRoute,
    (c) => handle(c, () => h.getDownloadableJobs(c, deps)),
  );
  router.openapi(
    getJobStatusRoute,
    (c) => handle(c, () => h.getJobStatus(c, deps)),
  );
  router.get(
    "/jobs/:jobId/download",
    (c) => handle(c, () => h.downloadJob(c, deps)),
  );
  router.openapi(cancelJobRoute, (c) => handle(c, () => h.cancelJob(c, deps)));
  router.openapi(
    getActiveJobRoute,
    (c) => handle(c, () => h.getActiveJob(c, deps)),
  );
  // Task pool
  router.openapi(
    getAllTasksRoute,
    (c) => handle(c, () => h.getAllTasks(c, deps)),
  );
  router.openapi(
    getTasksByTagRoute,
    (c) => handle(c, () => h.getTasksByTag(c, deps)),
  );
  router.openapi(
    getTasksByTypeRoute,
    (c) => handle(c, () => h.getTasksByType(c, deps)),
  );
  router.openapi(
    searchTasksRoute,
    (c) => handle(c, () => h.searchTasks(c, deps)),
  );
  router.openapi(
    getTasksByUserRoute,
    (c) => handle(c, () => h.getTasksByUser(c, deps)),
  );
  router.openapi(
    getTaskByIdRoute,
    (c) => handle(c, () => h.getTaskById(c, deps)),
  );
  router.openapi(
    createTaskRoute,
    (c) => handle(c, () => h.createTask(c, deps)),
  );
  router.openapi(
    addChildTaskRoute,
    (c) => handle(c, () => h.addChildTask(c, deps)),
  );
  router.openapi(
    updateTaskRoute,
    (c) => handle(c, () => h.updateTask(c, deps)),
  );
  router.openapi(
    deleteTaskRoute,
    (c) => handle(c, () => h.deleteTask(c, deps)),
  );
  router.openapi(
    clearTaskPoolRoute,
    (c) => handle(c, () => h.clearTaskPool(c, deps)),
  );
  // Tags
  router.openapi(
    getAllTagsRoute,
    (c) => handle(c, () => h.getAllTags(c, deps)),
  );
  router.openapi(
    getTagByIdRoute,
    (c) => handle(c, () => h.getTagById(c, deps)),
  );
  router.openapi(createTagRoute, (c) => handle(c, () => h.createTag(c, deps)));
  router.openapi(updateTagRoute, (c) => handle(c, () => h.updateTag(c, deps)));
  router.openapi(clearTagsRoute, (c) => handle(c, () => h.clearTags(c, deps)));
  router.openapi(deleteTagRoute, (c) => handle(c, () => h.deleteTag(c, deps)));

  return router;
}
