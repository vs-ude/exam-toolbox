// deno-lint-ignore-file no-explicit-any
import { newId } from '@diister/mongodbee';

import { Exam, ExamStub, User, parseExam, Task } from '../../types/mod.ts';
import { ExamToolboxDatabase } from '../mod.ts';

import { accessFilter } from './helpers.ts';

function newExamId(): string {
  return `exam:${newId()}`;
}

export async function getAllExams(
  this: ExamToolboxDatabase,
  user: User,
  limit: number = 20,
): Promise<ExamStub[]> {
  const exams: Exam[] = await this.collections.exams
    .find(accessFilter(user), { sort: { updatedAt: -1 }, limit })
    .toArray();
  return exams.map(exam => parseExam(exam) as ExamStub);
}

export async function getRecentExams(
  this: ExamToolboxDatabase,
  user: User,
  limit: number = 20,
): Promise<ExamStub[]> {
  return (
    await this.collections.exams
      .find(
        { lastEditedBy: user.sub, ...accessFilter(user) },
        { sort: { updatedAt: -1 }, limit },
      )
      .toArray()
  ).map(parseExam);
}

export async function getExamById(
  this: ExamToolboxDatabase,
  id: string,
  user: User,
): Promise<Exam | undefined> {
  const doc = await this.collections.exams.findOne({
    _id: id,
    ...accessFilter(user),
  });
  return doc ? parseExam(doc) : undefined;
}

export async function getExamByIdInternal(
  this: ExamToolboxDatabase,
  id: string,
): Promise<Exam | undefined> {
  const doc = await this.collections.exams.findOne({ _id: id });
  return doc ? parseExam(doc) : undefined;
}

export async function searchExams(
  this: ExamToolboxDatabase,
  text: string,
  user: User,
): Promise<ExamStub[]> {
  return (
    await this.collections.exams
      .find({
        $and: [
          accessFilter(user),
          {
            $or: [
              { courseName: { $regex: text, $options: 'i' } },
              { semester: { $regex: text, $options: 'i' } },
            ],
          },
        ],
      })
      .toArray()
  ).map(parseExam);
}
/**
 * Creates an exam. It creates or updates the tasks as needed using {@link upsertTasks}.
 * @param exam The exam data to upsert.
 * @param user The user performing the create.
 * @returns The ID of the created exam.
 */
export async function createExam(
  this: ExamToolboxDatabase,
  exam: Exam,
  user: User,
): Promise<string> {
  const id = newExamId();
  exam._id = id;
  const allTasks = exam.tasks.flatMap((group: any) => group.tasks as Task[]);
  await this.upsertTasks(allTasks, id, user);
  exam.lastEditedBy = user.sub;
  exam.updatedAt = new Date();
  if (!exam.access.users.includes(user.sub)) {
    exam.access.users.push(user.sub);
  }
  await this.collections.exams.insertOne({ ...exam });
  return id;
}

/**
 * Updates an exam, throwing an error if the id is not found. It creates or updates the tasks as needed using {@link upsertTasks}.
 * @param id The ID of the exam to update.
 * @param data The exam data to upsert.
 * @param user The user performing the update.
 * @returns The ID of the updated exam.
 * @throws {Error} If the exam with the given id is not found or if the user is not authorized to edit the exam.
 */
export async function updateExam(
  this: ExamToolboxDatabase,
  id: string,
  data: Exam,
  user: User,
): Promise<string> {
  const existing = (await this.collections.exams.findOne({ _id: id })) as Exam;
  if (!existing) {
    throw new Error(`Exam with id ${id} not found`);
  }
  const hasAccess =
    existing.access.users?.includes(user.sub) ||
    user.groups.some(g => existing.access.groups?.includes(g));
  if (!hasAccess) {
    throw new Error(`User ${user.sub} is not authorized to edit this exam`);
  }
  data._id = id;
  const allTasks = data.tasks.flatMap((group: any) => group.tasks as Task[]);
  await this.upsertTasks(allTasks, id, user);
  data.lastEditedBy = user.sub;
  data.updatedAt = new Date();
  if (!data.access.users.includes(user.sub)) {
    data.access.users.push(user.sub);
  }

  const { _id: _examId, ...updateData } = data as any;
  void _examId;
  await this.collections.exams.updateOne({ _id: id }, { $set: updateData });
  return id;
}

export async function deleteExam(
  this: ExamToolboxDatabase,
  id: string,
  user: User,
): Promise<number> {
  const result = await this.collections.exams.deleteOne({
    $and: [{ _id: id }, accessFilter(user)],
  });
  return result.deletedCount;
}

/**
 * Deletes all exams from the database.
 * Assumes the user taking the action is vetted by other mechanisms.
 */
export async function clearExams(this: ExamToolboxDatabase): Promise<number> {
  const result = await this.collections.exams.deleteMany({});
  return result.deletedCount;
}
