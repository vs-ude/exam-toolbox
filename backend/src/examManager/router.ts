import { Router } from "@oak/oak";
import { Database, Document, ObjectId } from "@db/mongo";
import { read, utils } from "@mirror/xlsx";
import { crypto } from "@std/crypto";
import { encodeHex } from "@std/encoding";
import * as fs from "@std/fs";

import { Exam, Language } from "../types/exam.ts";
import { Student } from "../types/student.ts";
import {
  compileExam,
  generateSolution,
  generateTasksLatex,
  renderMetaExam,
} from "./generation.ts";
import { ExamGenerationJob } from "./runtime.ts";
import { ensureQRCache } from "../services/qr.ts";

interface AppState {
  db: Database;
  jobs: Map<string, ExamGenerationJob>;
  taskQueue: any[];
  workers: any[];
  basePath: string;
  JOBS_DIR: string;
  processQueue: () => void;
  genExamCode: (lang: Language, counter: number) => string;
  getDownloadableJobs: () => Promise<{ examId: string; jobId: string }[]>;
  parseLogFileForSubtaskInfo: (logContent: string) => any[];
}

export function configureExamManagerRouter({
  db,
  jobs,
  taskQueue,
  workers,
  basePath,
  JOBS_DIR,
  processQueue,
  genExamCode,
  getDownloadableJobs,
  parseLogFileForSubtaskInfo,
}: AppState): Router {
  const router = new Router({ prefix: "/api" });

  const exams = db.collection("exams");
  const fileTracker = db.collection("fileTracker");

  router
    .get("/", (ctx) => {
      ctx.response.body = "API is running...";
    })
    .get("/user", (ctx) => {
      const user = ctx.state.user;
      if (!user || !user.id) {
        ctx.response.status = 401;
        ctx.response.body = { message: "Not authenticated" };
        return;
      }
      ctx.response.status = 200;
      ctx.response.body = { id: user.id, email: user.email, roles: user.roles };
    })
    .get("/exams", async (ctx) => {
      try {
        const examList = await exams.find().toArray();
        ctx.response.status = 200;
        ctx.response.body = examList;
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Error fetching exams", error };
      }
    })
    .get("/exams/recent", async (ctx) => {
      try {
        const userId = ctx.state.user.id;
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
    .get("/exam/:id", async (ctx) => {
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
    .get("/exams/search/:searchText", async (ctx) => {
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
    .get("/download", async (ctx) => {
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
      } catch (error: any) {
        console.error("Error reading file:", error);
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Error reading file",
          error: error.message,
        };
      }
    })
    .get("/jobs/:jobId/status", (ctx) => {
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
        downloadUrl: job.status === "completed"
          ? `/api/jobs/${jobId}/download`
          : null,
      };
    })
    .get("/jobs/:jobId/download", async (ctx) => {
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
    .get("/jobs/downloadable", async (ctx) => {
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
    .get("/exams/:examId/active-job", (ctx) => {
      const examId = ctx.params.examId;
      let activeJob = null;

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
    .post("/exams", async (ctx) => {
      const exam: Exam = await ctx.request.body.json();
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
    .post("/generate-exam", async (ctx) => {
      try {
        const exam: Exam = Object.assign(
          new Exam(),
          await ctx.request.body.json(),
        );
        const tempDir = await Deno.makeTempDir({ prefix: "exam_gen_single_" });
        exam.fillPagesAndPoints();
        await ensureQRCache(1, exam.pageCount!);
        await fs.copy(basePath, tempDir, { overwrite: true });
        await generateSolution(tempDir, exam);

        const { pdfBytes: examPDF, logContent } = await compileExam(tempDir);

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
    .post("/upload", async (ctx) => {
      const formData = await ctx.request.body.formData();
      console.log(formData);
      const file: File = formData.get("image") as File;

      if (!file || file.size === 0) {
        ctx.response.status = 400;
        ctx.response.body = { message: "No or empty file uploaded" };
        return;
      }
      const data = await file.bytes();
      const fileHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        data,
      );
      const fileHash = encodeHex(fileHashBuffer);
      const ext = file.name?.split(".").pop();
      const hashedFileName = ext ? `${fileHash}.${ext}` : fileHash;
      const uploadDir = "./uploads";
      const filePath = `${uploadDir}/${hashedFileName}`;
      await Deno.mkdir(uploadDir, { recursive: true });
      await Deno.writeFile(filePath, data);
      console.log("File saved to:", filePath);
      const fileTrackerEntry: Document = {
        name: file.name,
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
        url: `./uploads/${hashedFileName}`,
      };
      ctx.response.status = 200;
    })
    .post("/generate-exams", async (ctx) => {
      try {
        const formData = await ctx.request.body.formData();
        const examJson = JSON.parse(formData.get("exam")!.toString());
        const exam: Exam = Object.assign(
          new Exam(),
          examJson,
        );
        const startSeatNumber = parseInt(
          formData.get("startSeatNumber")?.toString() || "1",
          10,
        );
        const file = formData.get("list") as File;
        if (!file || !exam || file.size == 0 || !exam._id) {
          ctx.response.status = 400;
          ctx.response.body = {
            message: "Missing file, file content, exam data or exam id",
          };
          return;
        }

        const examId = exam._id;

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
                message:
                  `A generation job for this exam is already in progress. Please wait for it to complete.`,
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
        const tempOutputDir = `${jobDir}/temp_output`;
        const studentPdfDir = `${tempOutputDir}/student_pdfs`;
        await Deno.mkdir(studentPdfDir, { recursive: true });

        /*
         * Student PDF generation
         */
        const jobTemplatePath = await Deno.makeTempDir({
          prefix: "exam_template_",
          dir: jobDir,
        });

        exam.fillPagesAndPoints();
        await fs.copy(basePath, jobTemplatePath, { overwrite: true });
        await renderMetaExam(exam, jobTemplatePath);
        await generateTasksLatex(
          exam,
          jobTemplatePath,
          `${jobTemplatePath}/aufgaben.tex`,
          { solution: false },
        );

        const workbook = read(await file.arrayBuffer());
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
        const qrCachePromise = ensureQRCache(
          studentData.length,
          exam.pageCount!,
        );

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
          examCodes: [],
          studentResults: [],
        };

        let placeholderStudentID = 1000000;
        studentData.forEach((studentLine: any, index: number) => {
          const seatNumber = index + startSeatNumber;
          const deExamCode = genExamCode("DE", seatNumber);
          const enExamCode = genExamCode("EN", seatNumber);

          const student = new Student(
            `${studentLine.firstName} ${studentLine.lastName}`,
            studentLine.studentId != ""
              ? studentLine.studentId
              : placeholderStudentID++,
            {
              DE: deExamCode,
              EN: enExamCode,
            },
            seatNumber,
          );

          newJob.examCodes.push({ de: deExamCode, en: enExamCode });
          taskQueue.push({
            type: "student",
            jobId,
            exam,
            student,
            jobTemplatePath,
            outputDir: tempOutputDir,
            deRandomNumber: deExamCode,
            enRandomNumber: enExamCode,
            seatNumber,
          });
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

        /*
         * Solution PDF generation
         */
        const solutionJobTemplatePath = await Deno.makeTempDir({
          prefix: "exam_template_solution_",
          dir: jobDir,
        });

        await fs.copy(basePath, solutionJobTemplatePath, { overwrite: true });

        taskQueue.push({
          type: "solution",
          exam,
          jobId,
          jobTemplatePath: solutionJobTemplatePath,
          outputDir: tempOutputDir,
        });

        jobs.set(jobId, newJob);

        await qrCachePromise;
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
    .put("/exams/update", async (ctx) => {
      try {
        const { examId, updatedExam } = await ctx.request.body.json();
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
    .delete("/exams", async (ctx) => {
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
    .delete("/exams/:examId", async (ctx) => {
      const id = ctx.params.examId;

      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = { message: "Exam ID is required" };
        return;
      }

      try {
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
        ctx.response.status = 500;
        ctx.response.body = {
          message: "Internal server error during deletion",
        };
      }
    })
    .delete("/jobs/:jobId", async (ctx) => {
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
          message:
            `Job ${jobId} cannot be cancelled as it is already ${job.status}.`,
        };
      }
    });

  return router;
}
