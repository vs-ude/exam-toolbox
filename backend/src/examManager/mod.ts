export { configureExamManagerRouter } from "./router.ts";
export { configureTaskPoolRouter } from "./taskPoolRouter.ts";
export { configureTagRouter } from "./tagRouter.ts";
export type { Exam, Task, Task as TaskType, TaskGroup } from "./exam.ts";
export type { Tag } from "./tag.ts";
export {
  compileExam,
  generateTasksLatex,
  renderMetaExam,
  renderMetaStudent,
} from "./generation.ts";
export type { FileTracker } from "./fileTracker.ts";
export * from "./runtime.ts";
export * from "./err.ts";
