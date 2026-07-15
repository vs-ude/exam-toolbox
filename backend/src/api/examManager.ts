import {
  createRoute,
  defineOpenAPIRoute,
  OpenAPIHono,
  RouteConfig,
  z,
} from '@hono/zod-openapi';

import * as h from '../examManager/main.ts';
import { AppEnv } from '../types/mod.ts';
import { checkAccess, checkAdmin } from './middleware.ts';
import { handle } from './helpers.ts';
import {
  ActiveJobSchema,
  DeleteResultSchema,
  DownloadableJobSchema,
  ErrorSchema,
  ExamSchema,
  ExamStubSchema,
  JobStatusSchema,
  MessageSchema,
  TagSchema,
  TaskSchema,
  UpsertResultSchema,
} from './schemas.ts';

// All examManager routes require a Bearer JWT.
const BEARER: { Bearer: [] }[] = [{ Bearer: [] }];

// ── Shared param schemas ──────────────────────────────────────────────────────

const IdParam = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
});
const ExamIdParam = z.object({
  examId: z.string().openapi({ param: { name: 'examId', in: 'path' } }),
});
const JobIdParam = z.object({
  jobId: z.string().openapi({ param: { name: 'jobId', in: 'path' } }),
});
const TaskIdParam = z.object({
  taskId: z.string().openapi({ param: { name: 'taskId', in: 'path' } }),
});
const TagIdParam = z.object({
  tagId: z.string().openapi({ param: { name: 'tagId', in: 'path' } }),
});

// ── Route definitions – Exams ─────────────────────────────────────────────────

export function configureExamManagerRouter(
  deps: h.ExamManagerDeps,
): OpenAPIHono<AppEnv> {
  // ── Route definitions – Exams ───────────────────────────────────────────────

  const getAllExamsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/exams',
      tags: ['Exams'],
      security: BEARER,
      summary: 'List all exams',
      description: 'Returns metadata for every exam stored in the database.',
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(ExamStubSchema) } },
          description: 'Exam list',
        },
      },
    }),
    handler: c => handle(c, () => h.getAllExams(c, deps)),
  });

  const getRecentExamsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/exams/recent',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Recent exams',
      description:
        'Returns the 8 most recently edited exams for the authenticated user.',
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(ExamStubSchema) } },
          description: 'Recent exams',
        },
      },
    }),
    handler: c => handle(c, () => h.getRecentExams(c, deps)),
  });

  const searchExamsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/exams/search/{searchText}',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Search exams',
      description: 'Full-text search across exam metadata.',
      request: {
        params: z.object({
          searchText: z.string().openapi({
            param: { name: 'searchText', in: 'path' },
          }),
        }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(ExamStubSchema) } },
          description: 'Matching exams',
        },
      },
    }),
    handler: c => handle(c, () => h.searchExams(c, deps)),
  });

  const getExamByIdRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/exam/{id}',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Get exam by ID',
      description: 'Returns the full exam document including all task groups.',
      request: { params: IdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: ExamSchema } },
          description: 'Exam document',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.getExamById(c, deps)),
  });

  const createExamRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'post',
      path: '/exams',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Create exam',
      description:
        'Persists a new exam. The `lastEditedBy` field is set from the JWT.',
      middleware: [checkAccess],
      request: {
        body: {
          content: { 'application/json': { schema: ExamSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: UpsertResultSchema } },
          description: 'Created',
        },
      },
    }),
    handler: c => handle(c, () => h.upsertExam(c, deps)),
  });

  const updateExamRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'put',
      path: '/exams/:examId',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Update exam',
      description:
        'Replaces the exam document identified by `examId` with `updatedExam`.',
      middleware: [checkAccess],
      request: {
        body: {
          content: { 'application/json': { schema: ExamSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: UpsertResultSchema } },
          description: 'Updated',
        },
        400: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Missing fields',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.upsertExam(c, deps)),
  });

  const clearExamsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/exams',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Delete all exams',
      description:
        'Removes every exam from the database. Intended for development/testing only.',
      middleware: [checkAdmin],
      responses: {
        200: {
          content: { 'application/json': { schema: DeleteResultSchema } },
          description: 'All exams deleted',
        },
      },
    }),
    handler: c => handle(c, () => h.clearExams(c, deps)),
  });

  const deleteExamRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/exams/{examId}',
      tags: ['Exams'],
      security: BEARER,
      summary: 'Delete exam',
      description: 'Deletes a single exam by ID.',
      middleware: [checkAccess],
      request: { params: ExamIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Deleted',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.deleteExam(c, deps)),
  });

  // ── Route definitions – Jobs ──────────────────────────────────────────────

  const getDownloadableJobsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/jobs/downloadable',
      tags: ['Jobs'],
      security: BEARER,
      summary: 'List downloadable jobs',
      description:
        'Returns all completed generation jobs that have a downloadable ZIP artifact.',
      middleware: [checkAccess],
      responses: {
        200: {
          content: {
            'application/json': { schema: z.array(DownloadableJobSchema) },
          },
          description: 'Downloadable jobs',
        },
      },
    }),
    handler: c => handle(c, () => h.getDownloadableJobs(c, deps)),
  });

  const getJobStatusRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/jobs/{jobId}/status',
      tags: ['Jobs'],
      security: BEARER,
      summary: 'Get job status',
      description:
        'Returns the current status and progress of a generation job.',
      middleware: [checkAccess],
      request: { params: JobIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: JobStatusSchema } },
          description: 'Job status',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Job not found',
        },
      },
    }),
    handler: c => handle(c, () => h.getJobStatus(c, deps)),
  });

  const cancelJobRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/jobs/{jobId}',
      tags: ['Jobs'],
      security: BEARER,
      summary: 'Cancel job',
      description:
        'Cancels a queued or in-progress generation job and cleans up its working directory.',
      middleware: [checkAccess],
      request: { params: JobIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Cancelled',
        },
        400: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Job cannot be cancelled',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Job not found',
        },
      },
    }),
    handler: c => handle(c, () => h.cancelJob(c, deps)),
  });

  const getActiveJobRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/exams/{examId}/active-job',
      tags: ['Jobs'],
      security: BEARER,
      summary: 'Get active job for exam',
      description:
        'Returns the active (queued/processing/finalizing) generation job for the given exam, or null.',
      middleware: [checkAccess],
      request: { params: ExamIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: ActiveJobSchema } },
          description: 'Active job or null',
        },
      },
    }),
    handler: c => handle(c, () => h.getActiveJob(c, deps)),
  });

  // ── Route definitions – Task pool ─────────────────────────────────────────────

  const getAllTasksRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/taskPool',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'List all tasks',
      description: 'Returns all tasks in the pool.',
      middleware: [checkAccess],
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(TaskSchema) } },
          description: 'Task list',
        },
      },
    }),
    handler: c => handle(c, () => h.getAllTasks(c, deps)),
  });

  const getTasksByTagRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/taskPool/tags/{tagId}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Tasks by tag',
      description: 'Returns tasks that have the given tag assigned.',
      middleware: [checkAccess],
      request: { params: TagIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(TaskSchema) } },
          description: 'Matching tasks',
        },
      },
    }),
    handler: c => handle(c, () => h.getTasksByTag(c, deps)),
  });

  const getTasksByTypeRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/taskPool/type/{type}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Tasks by type',
      description:
        'Returns tasks of the specified type (e.g. multipleChoice, shortAnswer).',
      middleware: [checkAccess],
      request: {
        params: z.object({
          type: z.string().openapi({
            param: { name: 'type', in: 'path' },
            description: 'Task type discriminant',
            example: 'multipleChoice',
          }),
        }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(TaskSchema) } },
          description: 'Matching tasks',
        },
      },
    }),
    handler: c => handle(c, () => h.getTasksByType(c, deps)),
  });

  const searchTasksRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/taskPool/search/{questionText}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Search tasks',
      description: 'Full-text search on task question text.',
      middleware: [checkAccess],
      request: {
        params: z.object({
          questionText: z.string().openapi({
            param: { name: 'questionText', in: 'path' },
          }),
        }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(TaskSchema) } },
          description: 'Matching tasks',
        },
      },
    }),
    handler: c => handle(c, () => h.searchTasks(c, deps)),
  });

  const getTasksByUserRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/taskPool/user/{userId}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Tasks by creator',
      description: 'Returns tasks created by the specified user.',
      middleware: [checkAccess],
      request: {
        params: z.object({
          userId: z.string().openapi({ param: { name: 'userId', in: 'path' } }),
        }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(TaskSchema) } },
          description: 'Tasks by user',
        },
      },
    }),
    handler: c => handle(c, () => h.getTasksByUser(c, deps)),
  });

  const getTaskByIdRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/taskPool/{taskId}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Get task by ID',
      description: 'Returns the full task document for the given ID.',
      middleware: [checkAccess],
      request: { params: TaskIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: TaskSchema } },
          description: 'Task document',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.getTaskById(c, deps)),
  });

  const createTaskRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'post',
      path: '/taskPool',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Create task',
      description: 'Adds a new task to the pool.',
      middleware: [checkAccess],
      request: {
        body: {
          content: { 'application/json': { schema: TaskSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: UpsertResultSchema } },
          description: 'Created',
        },
      },
    }),
    handler: c => handle(c, () => h.createTask(c, deps)),
  });

  const addChildTaskRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'put',
      path: '/taskPool/addChild/{taskId}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Add child task',
      description:
        'Creates a child variant of an existing task and links it to the parent.',
      middleware: [checkAccess],
      request: {
        params: TaskIdParam,
        body: {
          content: { 'application/json': { schema: TaskSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Child task added',
        },
      },
    }),
    handler: c => handle(c, () => h.addChildTask(c, deps)),
  });

  const updateTaskRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'put',
      path: '/taskPool/{taskId}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Update task',
      description: 'Replaces the task document identified by `taskId`.',
      middleware: [checkAccess],
      request: {
        params: TaskIdParam,
        body: {
          content: { 'application/json': { schema: TaskSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Updated',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.updateTask(c, deps)),
  });

  const deleteTaskRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/taskPool/{taskId}',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Delete task',
      description: 'Removes the task identified by `taskId` from the pool.',
      middleware: [checkAccess],
      request: { params: TaskIdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Deleted',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.deleteTask(c, deps)),
  });

  const clearTaskPoolRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/taskPool',
      tags: ['Tasks'],
      security: BEARER,
      summary: 'Clear task pool',
      description:
        'Removes all tasks from the pool. Intended for development/testing only.',
      middleware: [checkAdmin],
      responses: {
        200: {
          content: { 'application/json': { schema: DeleteResultSchema } },
          description: 'All tasks deleted',
        },
      },
    }),
    handler: c => handle(c, () => h.clearTaskPool(c, deps)),
  });

  // ── Route definitions – Tags ──────────────────────────────────────────────

  const getAllTagsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/tags',
      tags: ['Tags'],
      security: BEARER,
      summary: 'List all tags',
      description: 'Returns all tags in the database.',
      middleware: [checkAccess],
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(TagSchema) } },
          description: 'Tag list',
        },
      },
    }),
    handler: c => handle(c, () => h.getAllTags(c, deps)),
  });

  const getTagByIdRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/tags/{id}',
      tags: ['Tags'],
      security: BEARER,
      summary: 'Get tag by ID',
      description: 'Returns the tag document for the given ID.',
      middleware: [checkAccess],
      request: { params: IdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: TagSchema } },
          description: 'Tag document',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.getTagById(c, deps)),
  });

  const createTagRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'post',
      path: '/tags',
      tags: ['Tags'],
      security: BEARER,
      summary: 'Create tag',
      description: 'Adds a new tag to the database.',
      middleware: [checkAccess],
      request: {
        body: {
          content: { 'application/json': { schema: TagSchema } },
          required: true,
        },
      },
      responses: {
        201: {
          content: { 'application/json': { schema: UpsertResultSchema } },
          description: 'Created',
        },
      },
    }),
    handler: c => handle(c, () => h.createTag(c, deps)),
  });

  const updateTagRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'put',
      path: '/tags/{id}',
      tags: ['Tags'],
      security: BEARER,
      summary: 'Update tag',
      description: 'Replaces the tag document identified by `id`.',
      middleware: [checkAccess],
      request: {
        params: IdParam,
        body: {
          content: { 'application/json': { schema: TagSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Updated',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.updateTag(c, deps)),
  });

  const clearTagsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/tags',
      tags: ['Tags'],
      security: BEARER,
      summary: 'Clear all tags',
      description: 'Removes all tags. Intended for development/testing only.',
      middleware: [checkAdmin],
      responses: {
        200: {
          content: { 'application/json': { schema: DeleteResultSchema } },
          description: 'All tags deleted',
        },
      },
    }),
    handler: c => handle(c, () => h.clearTags(c, deps)),
  });

  const deleteTagRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/tags/{id}',
      tags: ['Tags'],
      security: BEARER,
      summary: 'Delete tag',
      description:
        'Deletes the tag and removes it from all tasks that reference it.',
      middleware: [checkAccess],
      request: { params: IdParam },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Deleted',
        },
        400: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Invalid ID',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => h.deleteTag(c, deps)),
  });

  // ── Router registration ──────────────────────────────────────────────────────────

  const router = new OpenAPIHono<AppEnv>();

  // Files – binary responses, not suitable for JSON schema validation
  router.get('/download', c => handle(c, () => h.downloadFile(c, deps)));
  router.post('/upload', c => handle(c, () => h.uploadFile(c, deps)));
  // Exam generation – multipart or binary responses
  router.post('/generate-exam', c => handle(c, () => h.generateExam(c, deps)));
  router.post('/generate-exams', c =>
    handle(c, () => h.generateExams(c, deps)),
  );
  // Jobs – binary download, no JSON schema
  router.get('/jobs/:jobId/download', c =>
    handle(c, () => h.downloadJob(c, deps)),
  );

  router.openapiRoutes([
    // Exams
    getAllExamsRoute,
    getRecentExamsRoute,
    searchExamsRoute,
    getExamByIdRoute,
    createExamRoute,
    updateExamRoute,
    clearExamsRoute,
    deleteExamRoute,
    // Jobs
    getDownloadableJobsRoute,
    getJobStatusRoute,
    cancelJobRoute,
    getActiveJobRoute,
    // Tasks
    getAllTasksRoute,
    getTasksByTagRoute,
    getTasksByTypeRoute,
    searchTasksRoute,
    getTasksByUserRoute,
    getTaskByIdRoute,
    createTaskRoute,
    addChildTaskRoute,
    updateTaskRoute,
    deleteTaskRoute,
    clearTaskPoolRoute,
    // Tags
    getAllTagsRoute,
    getTagByIdRoute,
    createTagRoute,
    updateTagRoute,
    clearTagsRoute,
    deleteTagRoute,
  ]);

  return router;
}
