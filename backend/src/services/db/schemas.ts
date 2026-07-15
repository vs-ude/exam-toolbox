import { dbId, withIndex } from '@diister/mongodbee';
import * as v from '@diister/mongodbee/schema';

// ── Schemas ───────────────────────────────────────────────────────────────
// Schemas are intentionally loose (v.any() for nested structures) since
// application-level validation is handled by parseExam / parseTask.

export const examSchema = {
  _id: dbId('exam'),
  courseName: v.string(),
  examinerName: v.string(),
  semester: v.string(),
  date: v.string(),
  examLengthMinutes: v.number(),
  tasks: v.any(),
  points: v.optional(v.number()),
  pageCount: v.optional(v.number()),
  conceptPages: v.optional(v.number()),
  lastEditedBy: v.optional(v.string()),
  updatedAt: v.optional(v.any()),
  access: v.object({
    users: v.optional(v.array(v.string())),
    groups: v.optional(v.array(v.string())),
  }),
  bilingual: v.boolean(),
};

export const taskSchema = {
  _id: dbId('task'),
  type: v.string(),
  question: v.any(),
  points: v.number(),
  tagIds: v.array(v.string()),
  tags: v.any(),
  createdBy: v.string(),
  createdAt: v.any(),
  lastUsed: v.any(),
  usedIn: v.array(v.string()),
  parent: v.optional(v.string()),
  children: v.array(v.string()),
  numCorrect: v.optional(v.any()),
  answerOptions: v.optional(v.any()),
  header: v.optional(v.any()),
  lines: v.optional(v.any()),
  noLines: v.optional(v.any()),
  solution: v.optional(v.any()),
  questionPicture: v.optional(v.any()),
  solutionPicture: v.optional(v.any()),
  size: v.optional(v.any()),
  questionLatex: v.optional(v.any()),
  tableHeadersQuestion: v.optional(v.any()),
  tableDataQuestion: v.optional(v.any()),
  tableHeadersSolution: v.optional(v.any()),
  tableDataSolution: v.optional(v.any()),
};

export const tagSchema = {
  _id: dbId('tag'),
  name: v.string(),
  color: v.optional(v.string()),
  textColor: v.optional(v.string()),
};

export const fileTrackerSchema = {
  _id: dbId('file'),
  name: v.string(),
  refs: v.optional(v.array(v.string())),
};

export const userSchema = {
  _id: dbId('user'),
  sub: withIndex(v.string(), { unique: true }),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  active: v.boolean(),
  groups: v.array(v.string()),
  lastLoginAt: v.optional(v.date()),
  createdAt: v.date(),
};

export const groupSchema = {
  _id: dbId('group'),
  name: withIndex(v.string(), { unique: true }),
  rights: v.optional(v.any()),
};

export const qrCodeSchema = {
  _id: dbId('qr'),
  studentsPerLanguage: v.optional(v.number()),
  pagesPerStudent: v.optional(v.number()),
  lastUpdated: v.optional(v.string()),
  pages: v.optional(v.any()),
};
