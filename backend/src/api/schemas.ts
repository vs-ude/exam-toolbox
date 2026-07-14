import { z } from '@hono/zod-openapi';

export const ErrorSchema = z.object({ message: z.string() }).openapi('Error');

export const MessageSchema = z
  .object({ message: z.string() })
  .openapi('Message');

export const UpsertResultSchema = z
  .object({ message: z.string(), insertedId: z.string() })
  .openapi('InsertResult');

export const DeleteResultSchema = z
  .object({ message: z.string(), deletedCount: z.number() })
  .openapi('DeleteResult');

export const HealthSchema = z
  .object({ db: z.boolean(), ldap: z.boolean() })
  .openapi('Health');

export const LoginBodySchema = z
  .object({
    username: z.string().openapi({ example: 'test1' }),
    password: z.string().openapi({ example: 'testpass' }),
  })
  .openapi('LoginBody');

export const LoginResponseSchema = z
  .object({ token: z.string() })
  .openapi('LoginResponse');

export const GroupStubSchema = z
  .object({
    name: z.string(),
  })
  .openapi('GroupStub');

export const GroupSchema = GroupStubSchema.extend({
  rights: z.enum(['admin', 'full', 'limited']),
}).openapi('Group');

export const UserStubSchema = z
  .object({
    sub: z.string(),
    name: z.string(),
  })
  .openapi('UserStub');

export const UserSchema = UserStubSchema.extend({
  email: z.string().email(),
  groups: z.array(z.string()),
  active: z.boolean().optional(),
  lastLoginAt: z.string().datetime().optional(),
}).openapi('User');

export const TagSchema = z
  .object({
    _id: z.string().optional(),
    name: z.string(),
    color: z.string().openapi({
      description: 'CSS colour for the tag chip background',
    }),
    textColor: z.string().openapi({
      description: 'CSS colour for the tag chip text',
    }),
  })
  .openapi('Tag');

/** Loose schema for a polymorphic task pool entry. */
export const TaskSchema = z.record(z.string(), z.unknown()).openapi('Task');

/** Top-level exam fields. Tasks are left as unknown to keep the spec concise. */
export const ExamStubSchema = z
  .object({
    _id: z.string().optional(),
    courseName: z.string(),
    bilingual: z.boolean(),
    examinerName: z.string(),
    semester: z.string(),
    date: z.string(),
    examLengthMinutes: z.number(),
    points: z.number().optional(),
    pageCount: z.number().optional(),
    conceptPages: z.number().optional(),
    lastEditedBy: z.string().optional(),
    updatedAt: z.string().datetime().optional(),
    access: z
      .object({
        users: z.array(z.string()).optional(),
        groups: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .openapi('ExamStub');

export const ExamSchema = ExamStubSchema.extend({
  tasks: z.array(z.unknown()).openapi({
    description: 'Task groups making up the exam',
  }),
}).openapi('Exam');

const JobProgressSchema = z.object({
  total: z.number(),
  completed: z.number(),
  failed: z.number(),
});

export const JobStatusSchema = z
  .object({
    jobId: z.string(),
    status: z.enum([
      'queued',
      'processing',
      'finalizing',
      'completed',
      'failed',
    ]),
    progress: JobProgressSchema,
    downloadUrl: z.string().nullable(),
  })
  .openapi('JobStatus');

export const ActiveJobSchema = z
  .union([
    z.object({
      jobId: z.string(),
      status: z.enum(['queued', 'processing', 'finalizing']),
      progress: JobProgressSchema,
    }),
    z.null(),
  ])
  .openapi('ActiveJob');

export const DownloadableJobSchema = z
  .object({ examId: z.string(), jobId: z.string() })
  .openapi('DownloadableJob');
