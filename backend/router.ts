// @ts-ignore
import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
// @ts-ignore
import {
  MongoClient,
  Collection,
  Database,
} from "https://deno.land/x/mongo/mod.ts";
import { Exam, Task, Translation } from "./exam.ts";
import { FileTracker } from "./fileTracker.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.33.0/deps.ts";
import { ZipWriter } from "https://deno.land/x/zipjs/index.js";
import { walk } from "https://deno.land/std/fs/walk.ts";
// @ts-ignore
import {
  read,
  utils,
} from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";
import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { copy } from "https://deno.land/std@0.224.0/fs/copy.ts";
import {
  updateMetaStudent,
  generateExam,
  updateMetaTemplate,
  generateTasksLatex,
} from "./generation.ts";
import { Tag } from "./tag.ts";

interface ExamGenerationJob {
  jobId: string;
  examId: string;
  userEmail: string;
  status: "queued" | "processing" | "finalizing" | "completed" | "failed";
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  jobDir: string;
  zipPath?: string;
  createdAt: Date;
  studentData: any[];
  randomNumbers: { de: string; en: string }[];
  studentResults: any[];
}

interface AppState {
  db: Database;
  jobs: Map<string, ExamGenerationJob>;
  taskQueue: any[];
  workers: any[];
  basePath: string;
  JOBS_DIR: string;
  processQueue: () => void;
  genRandomNumber: (lang: "de" | "en", counter: number) => string;
  getDownloadableJobs: () => Promise<{ examId: string; jobId: string }[]>;
  parseLogFileForSubtaskInfo: (logContent: string) => any[];
}

export function configureRouter({
  db,
  jobs,
  taskQueue,
  workers,
  basePath,
  JOBS_DIR,
  processQueue,
  genRandomNumber,
  getDownloadableJobs,
  parseLogFileForSubtaskInfo,
}: AppState): Router {
  const router = new Router();

  const exams = db.collection("exams");
  const pool = db.collection("taskPool");
  const fileTracker = db.collection("fileTracker");
  const tags = db.collection("tags");

  router
    .get("/", (ctx) => {
      ctx.response.body = "API is running...";
    })
    .get("/api/user", (ctx) => {
      const user = ctx.state.user;
      if (!user || !user.id) {
        ctx.response.status = 401;
        ctx.response.body = { message: "Not authenticated" };
        return;
      }
      ctx.response.status = 200;
      ctx.response.body = { id: user.id, email: user.email, roles: user.roles };
    })
    .get("/api/exams", async (ctx) => {
      try {
        const examList = await exams.find().toArray();
        ctx.response.status = 200;
        ctx.response.body = examList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching exams", error };
      }
    })
    .get("/api/exams/recent", async (ctx) => {
      try {
        const userId = ctx.state.user.id;
        // Find exams edited by this user, sort by date desc, limit to 8
        const recentExams = await exams
          .find({ lastEditedBy: userId })
          .sort({ updatedAt: -1 })
          .limit(8)
          .toArray();

        ctx.response.status = 200;
        ctx.response.body = recentExams;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching recent exams", error };
      }
    })
    .get("/api/exam/:id", async (ctx) => {
      try {
        const examId = ctx.params.id;
        const mongoId = new ObjectId(examId);
        const exam = await exams.findOne({ _id: mongoId });
        if (!exam) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Exam not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = exam;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching exam", error };
      }
    })
    .get("/api/exams/search/:searchText", async (ctx) => {
      try {
        const searchText = ctx.params.searchText;
        const examList = await exams
          .find({
            $or: [
              { courseName: { $regex: searchText, $options: "i" } },
              { semester: { $regex: searchText, $options: "i" } },
            ],
          })
          .toArray();
        ctx.response.status = 200;
        ctx.response.body = examList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error searching exams", error };
      }
    })
    .get("/api/download", async (ctx) => {
      const fileUrl = ctx.request.url.searchParams.get("fileUrl");
      if (!fileUrl) {
        ctx.response.status = 400;
        ctx.response.body = { message: "File URL is required" };
        return;
      }
      try {
        const fileContent = await Deno.readFile(fileUrl);
        const fileName = fileUrl.split("/").pop() || "downloaded_file";
        const fileExtension = fileName.split(".").pop()?.toLowerCase();
        let contentType = "application/octet-stream";
        switch (fileExtension) {
          case "pdf":
            contentType = "application/pdf";
            break;
          case "jpg":
          case "jpeg":
            contentType = "image/jpeg";
            break;
          case "png":
            contentType = "image/png";
            break;
          default:
            contentType = "application/octet-stream";
        }
        ctx.response.headers.set("Content-Type", contentType);
        ctx.response.headers.set(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        ctx.response.body = fileContent;
        console.log("sending file: ", fileUrl);
      } catch (error) {
        console.error("Error reading file:", error);
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Error reading file",
          error: error.message,
        };
      }
    })
    .get("/api/jobs/:jobId/status", (ctx) => {
      const jobId = ctx.params.jobId;
      const job = jobs.get(jobId);
      if (!job) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Job not found" };
        return;
      }
      ctx.response.status = 200;
      ctx.response.body = {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        downloadUrl:
          job.status === "completed" ? `/api/jobs/${jobId}/download` : null,
      };
    })
    .get("/api/jobs/:jobId/download", async (ctx) => {
      const jobId = ctx.params.jobId;
      const job = jobs.get(jobId);
      if (!job) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Job not found" };
        return;
      }
      if (job.userEmail !== ctx.state.user.email) {
        ctx.response.status = 403;
        ctx.response.body = { message: "Forbidden" };
        return;
      }
      if (job.status !== "completed" || !job.zipPath) {
        ctx.response.status = 400;
        ctx.response.body = {
          message: "Job is not yet complete or the file is missing.",
        };
        return;
      }
      try {
        const zipFileBytes = await Deno.readFile(job.zipPath);
        ctx.response.headers.set("Content-Type", "application/zip");
        ctx.response.headers.set(
          "Content-Disposition",
          `attachment; filename="exams_${jobId}.zip"`,
        );
        ctx.response.body = zipFileBytes;
      } catch (error) {
        console.error(`Error sending zip file for job ${jobId}:`, error);
        ctx.response.status = 500;
        ctx.response.body = { message: "Error reading the generated file." };
      }
    })
    .get("/api/taskPool", async (ctx) => {
      try {
        const taskList = await pool.find().toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks", error };
      }
    })
    .get("/api/taskPool/:taskId", async (ctx) => {
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
    .get("/api/taskPool/type/:type", async (ctx) => {
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
    .get("/api/taskPool/tags/:tag", async (ctx) => {
      const tag = ctx.params.tag;
      try {
        const taskList = await pool
          .find({ tags: { $elemMatch: { name: tag } } })
          .toArray();
        ctx.response.status = 200;
        ctx.response.body = taskList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tasks by tag", error };
      }
    })
    .get("/api/taskPool/search/:questionText", async (ctx) => {
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
    .put("/api/taskPool/addChild/:taskId", async (ctx) => {
      try {
        const id = ctx.params.taskId;
        const { childTaskId } = await ctx.request.body().value;

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
    .get("/api/taskPool/user/:userId", async (ctx) => {
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
    .get("/api/jobs/downloadable", async (ctx) => {
      try {
        const downloadableJobs = await getDownloadableJobs();
        ctx.response.status = 200;
        ctx.response.body = downloadableJobs;
      } catch (error) {
        console.error("Error fetching downloadable jobs:", error);
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Error fetching downloadable jobs list",
        };
      }
    })
    // Check for active job for a specific exam. This allows the frontend to "resume" the progress bar if the dialog was closed
    .get("/api/exams/:examId/active-job", (ctx) => {
      const examId = ctx.params.examId;
      let activeJob = null;

      // Scan the in-memory jobs map for a match that is currently running
      for (const job of jobs.values()) {
        if (
          job.examId === examId &&
          ["queued", "processing", "finalizing"].includes(job.status)
        ) {
          activeJob = job;
          break;
        }
      }

      if (activeJob) {
        ctx.response.status = 200;
        ctx.response.body = {
          jobId: activeJob.jobId,
          status: activeJob.status,
          progress: activeJob.progress,
        };
      } else {
        ctx.response.status = 200;
        ctx.response.body = null;
      }
    })
    .post("/api/exams", async (ctx) => {
      const exam: Exam = await ctx.request.body().value;
      exam.lastEditedBy = ctx.state.user.id;
      exam.updatedAt = new Date();
      try {
        const result = await exams.insertOne(exam);
        ctx.response.status = 200;
        ctx.response.body = {
          message: "Exam saved successfully! ",
          insertedId: result,
        };
      } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error saving exam", error: err };
      }
    })
    // functions as a preview and also sends information about the finished pdf to frontend (like which subtask is at which page)
    .post("/api/generate-exam", async (ctx) => {
      try {
        const exam: Exam = await ctx.request.body().value;
        const tempDir = await Deno.makeTempDir({ prefix: "exam_gen_single_" });
        await copy(basePath, tempDir, { overwrite: true });
        const tasksPath = `${tempDir}/aufgaben.tex`;
        await updateMetaTemplate(exam, tempDir);
        await updateMetaStudent(
          {
            vollername: "Max Musterloesung",
            matrikelnummer: 0,
            zeigeloesung: "yes",
            sprache: "de",
          },
          tempDir,
        );
        const tasksContentLatex = await generateTasksLatex(exam, tempDir);
        await Deno.writeTextFile(tasksPath, tasksContentLatex);
        const { pdfBytes: examPDF, logContent } = await generateExam(tempDir);

        const subtaskInfo = parseLogFileForSubtaskInfo(logContent);
        const subtaskInfoJson = JSON.stringify(subtaskInfo);

        ctx.response.headers.set("X-Subtask-Info", subtaskInfoJson);
        ctx.response.headers.set(
          "Access-Control-Expose-Headers",
          "X-Subtask-Info",
        );

        ctx.response.headers.set("Content-Type", "application/pdf");
        ctx.response.headers.set(
          "Content-Disposition",
          `attachment; filename="${exam.courseName}.pdf"`,
        );
        ctx.response.body = examPDF;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error generating Exam PDF", error };
      }
    })
    .post("/api/upload", async (ctx) => {
      const body = ctx.request.body({ type: "form-data" });
      const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 });

      if (!formData.files || formData.files.length === 0) {
        ctx.response.status = 400;
        ctx.response.body = { message: "No file uploaded" };
        return;
      }
      const file = formData.files[0];
      if (!file.content) {
        ctx.response.status = 400;
        ctx.response.body = { message: "No file content" };
        return;
      }
      const fileHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        file.content,
      );
      const fileHash = encodeHex(fileHashBuffer);
      const ext = file.originalName?.split(".").pop();
      const hashedFileName = ext ? `${fileHash}.${ext}` : fileHash;
      file.originalName = hashedFileName;
      const uploadDir = "./uploads";
      const filePath = `${uploadDir}/${file.originalName}`;
      if (file.content) {
        await Deno.mkdir(uploadDir, { recursive: true });
        await Deno.writeFile(filePath, file.content);
        console.log("File saved to:", filePath);
      }
      const fileTrackerEntry: any = {
        name: file.originalName,
        refs: [],
        timeToLive: 7,
      };
      try {
        await fileTracker.insertOne(fileTrackerEntry);
        console.log("File tracker entry created:", fileTrackerEntry);
      } catch (error) {
        console.error("Error inserting file tracker entry:", error);
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Error inserting file tracker entry",
          error,
        };
        return;
      }
      ctx.response.body = {
        message: "File uploaded successfully",
        url: `./uploads/${file.originalName}`,
      };
      ctx.response.status = 200;
    })
    .post("/api/generate-exams", async (ctx) => {
      try {
        const body = ctx.request.body({ type: "form-data" });
        const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 });
        const examJson: Exam = JSON.parse(formData.fields.exam);
        const file = formData.files?.find((f) => f.name === "list");
        if (!file || !examJson || !file.content || !examJson._id) {
          ctx.response.status = 400;
          ctx.response.body = {
            message: "Missing file, file content, exam data or exam id",
          };
          return;
        }

        const examId = examJson._id;

        for (const [jobId, existingJob] of jobs.entries()) {
          if (existingJob.examId === examId) {
            if (
              ["processing", "queued", "finalizing"].includes(
                existingJob.status,
              )
            ) {
              console.log(
                `Blocked new job request for exam ${examId} because job ${existingJob.jobId} is already active.`,
              );
              ctx.response.status = 409;
              ctx.response.body = {
                message: `A generation job for this exam is already in progress. Please wait for it to complete.`,
              };
              return;
            }
            console.log(
              `Found old, finished job ${existingJob.jobId} (status: ${existingJob.status}) for exam ${examId}. Replacing it.`,
            );
            await Deno.remove(existingJob.jobDir, { recursive: true }).catch(
              (err) => {
                console.error(
                  `Error cleaning up old job directory ${existingJob.jobId}:`,
                  err,
                );
              },
            );
            jobs.delete(jobId);
            break;
          }
        }

        const jobId = crypto.randomUUID();
        const jobDir = `${JOBS_DIR}/${jobId}`;
        const jobTemplatePath = `${jobDir}/template`;
        const tempOutputDir = `${jobDir}/temp_output`;
        const studentPdfDir = `${tempOutputDir}/student_pdfs`;
        await Deno.mkdir(studentPdfDir, { recursive: true });

        await copy(basePath, jobTemplatePath, { overwrite: true });
        await updateMetaTemplate(examJson, jobTemplatePath);
        const tasksContentLatex = await generateTasksLatex(
          examJson,
          jobTemplatePath,
        );
        await Deno.writeTextFile(
          `${jobTemplatePath}/aufgaben.tex`,
          tasksContentLatex,
        );

        const workbook = read(file.content, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const studentData = utils
          .sheet_to_json(worksheet, {
            header: [
              "examPlanId",
              "examNumber",
              "examTitle",
              "lastName",
              "firstName",
              "studentId",
            ],
            range: 5,
          })
          .filter((student: any) => student.firstName && student.lastName);

        const totalTasks = studentData.length + 3;

        const newJob: ExamGenerationJob = {
          jobId,
          examId,
          userEmail: ctx.state.user.email,
          status: "processing",
          progress: { total: totalTasks, completed: 0, failed: 0 },
          jobDir,
          createdAt: new Date(),
          studentData,
          randomNumbers: [],
          studentResults: [],
        };

        studentData.forEach((student: any, index: number) => {
          const seatNumber = index + 1;
          const deRandomNumber = genRandomNumber("de", index + 1);
          const enRandomNumber = genRandomNumber("en", index + 1);
          newJob.randomNumbers.push({ de: deRandomNumber, en: enRandomNumber });
          taskQueue.push({
            type: "student",
            jobId,
            student,
            jobTemplatePath,
            outputDir: tempOutputDir,
            deRandomNumber,
            enRandomNumber,
            seatNumber,
          });
        });

        taskQueue.push({
          type: "solution",
          jobId,
          jobTemplatePath,
          outputDir: tempOutputDir,
        });
        taskQueue.push({
          type: "log",
          jobId,
          jobTemplatePath,
          outputDir: tempOutputDir,
          lang: "de",
        });
        taskQueue.push({
          type: "log",
          jobId,
          jobTemplatePath,
          outputDir: tempOutputDir,
          lang: "en",
        });

        jobs.set(jobId, newJob);

        workers.forEach(() => processQueue());

        ctx.response.status = 202;
        ctx.response.body = {
          jobId,
          message: "Exam generation job has been started.",
        };
      } catch (error) {
        console.error("Error starting mass-exam generation job:", error);
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Error starting exam generation job",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
    .post("/api/taskPool", async (ctx) => {
      const task: Task = await ctx.request.body().value;
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
    .put("/api/exams/update", async (ctx) => {
      try {
        const { examId, updatedExam } = await ctx.request.body().value;
        if (!examId || !updatedExam) {
          ctx.response.status = 400;
          ctx.response.body = {
            message: "Exam ID and updated data are required",
          };
          return;
        }
        const mongoId = new ObjectId(examId);
        const updateData = { ...updatedExam };
        delete updateData._id;

        updateData.lastEditedBy = ctx.state.user.id;
        updateData.updatedAt = new Date();

        const result = await exams.updateOne(
          { _id: mongoId },
          { $set: updateData },
        );
        if (result.matchedCount === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Exam not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = { message: "Exam updated successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error updating exam", error };
      }
    })
    .put("/api/taskPool/:taskId", async (ctx) => {
      try {
        const id = ctx.params.taskId;
        const { _id, ...updateData } = await ctx.request.body().value;

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

    .delete("/api/exams", async (ctx) => {
      try {
        const result = await exams.deleteMany({});
        ctx.response.status = 200;
        ctx.response.body = {
          message: `${result} exams deleted successfully!`,
          deletedCount: result,
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting exams", error };
      }
    })
    .delete("/api/exams/:examId", async (ctx) => {
      const id = ctx.params.examId;

      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = { message: "Exam ID is required" };
        return;
      }

      try {
        // Attempt to delete the exam from the 'exams' collection
        const result = await exams.deleteOne({ _id: new ObjectId(id) });

        if (result === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Exam not found" };
        } else {
          ctx.response.status = 200;
          ctx.response.body = { message: "Exam deleted successfully" };
          console.log(`Exam ${id} deleted.`);
        }
      } catch (error) {
        console.error("Error deleting exam:", error);
        ctx.response.status = 500; // Or 400 if the ObjectId format is wrong
        ctx.response.body = {
          message: "Internal server error during deletion",
        };
      }
    })
    .delete("/api/jobs/:jobId", async (ctx) => {
      const jobId = ctx.params.jobId;
      const job = jobs.get(jobId);

      if (!job) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Job not found" };
        return;
      }

      if (job.status === "processing" || job.status === "queued") {
        console.log(`Cancellation requested for job: ${jobId}`);

        job.status = "failed";

        taskQueue = taskQueue.filter((task) => task.jobId !== jobId);

        await Deno.remove(job.jobDir, { recursive: true }).catch((err) => {
          console.error(
            `Error during immediate cleanup for cancelled job ${jobId}:`,
            err,
          );
        });

        ctx.response.status = 200;
        ctx.response.body = { message: `Job ${jobId} has been cancelled.` };
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          message: `Job ${jobId} cannot be cancelled as it is already ${job.status}.`,
        };
      }
    })
    .delete("/api/taskPool/:taskId", async (ctx) => {
      try {
        const result = await pool.deleteOne({ taskId: ctx.params.taskId });
        if (result.deletedCount === 0) {
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
    .delete("/api/taskPool", async (ctx) => {
      try {
        const result = await pool.deleteMany({});
        await fileTracker.deleteMany({});
        await fs.emptyDir("./uploads");
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
    .get("/api/tags/:id", async (ctx) => {
      const tagName = ctx.params.id;
      try {
        const tag = await tags.findOne({ "tag.name": tagName });
        if (!tag) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = tag;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tag", error };
      }
    })
    .get("/api/tags", async (ctx) => {
      try {
        const tagList = await tags.find().toArray();
        ctx.response.status = 200;
        ctx.response.body = tagList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching tags", error };
      }
    })
    .put("/api/tags/:id", async (ctx) => {
      try {
        const tagName = ctx.params.id;
        const { _id, ...tag } = await ctx.request.body().value;

        const result = await tags.updateOne(
          { "tag.name": tagName },
          { $set: { tag: tag } },
        );

        if (result.matchedCount === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = { message: "Tag updated successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error updating tag", error };
      }
    })
    .post("/api/tags", async (ctx) => {
      const tag: Tag = await ctx.request.body().value;
      try {
        const result = await tags.insertOne({ tag });
        ((ctx.response.status = 200),
          (ctx.response.body = {
            message: "Tag saved successfully!",
            insertedId: result,
          }));
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error saving tag", error: error };
      }
    })
    .delete("/api/tags", async (ctx) => {
      try {
        const result = await tags.deleteMany({});
        ctx.response.status = 200;
        ctx.response.body = {
          message: `${result} tags deleted successfully!`,
          deletedCount: result,
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting tags", error };
      }
    })
    .delete("/api/tags/:id", async (ctx) => {
      const tagName = ctx.params.id;
      try {
        const result = await tags.deleteOne({ name: tagName });
        if (result.deletedCount === 0) {
          ctx.response.status = 404;
          ctx.response.body = { message: "Tag not found" };
          return;
        }
        ctx.response.status = 200;
        ctx.response.body = { message: "Tag deleted successfully" };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting tag", error };
      }
    });

  return router;
}
