import type { Exam } from "./exam.ts";
import { getTaskRenderer, type RenderOptions } from "./taskRenderer.ts";
import { escapeLatex, getEta } from "../services/mod.ts";
import { InvalidPageBreakError, LatexCompileError } from "./err.ts";
import { TaskGroup } from "./mod.ts";

type ExamMetaTemplateData = {
  veranstaltung: string;
  semester: string;
  pruefer: string;
  datum: string;
  duration: string;
  schmierblaetteranzahl: string;
  englishandgerman: string;
  points: number;
};

type IndividualMetaTemplateData = {
  zeigeloesung: string;
  sprache: string;
  randomexamnumber: string;
  sequenznummer: string;
  vollername: string;
  matrikelnummer: string;
};

const DEFAULT_EXAM_META: ExamMetaTemplateData = {
  veranstaltung: "Probeklausur\\ 2021",
  semester: "WS\\ 2020/21",
  pruefer: "Prof.\\ Dr.-Ing.\\ T.\\ Weis",
  datum: "2021-02-01",
  duration: "90",
  schmierblaetteranzahl: "2",
  englishandgerman: "yes",
  points: 42,
};

const DEFAULT_INDIVIDUAL_META: IndividualMetaTemplateData = {
  zeigeloesung: "no",
  sprache: "de",
  randomexamnumber: "R4ND",
  sequenznummer: "6",
  vollername: "Tom\\ Morello",
  matrikelnummer: "100000",
};

function escapeLatexWithSpaces(text?: string): string {
  return escapeLatex(text).replace(/ /g, "\\ ");
}

// Executes tectonic to compile a .tex file and returns the resulting pdf and log file
export async function compileExam(
  workingDir: string,
): Promise<{ pdfBytes: Uint8Array; logContent: string }> {
  const examPdfPath = `${workingDir}/exam.pdf`;
  const examLogPath = `${workingDir}/exam.log`;

  const cmd = new Deno.Command("tectonic", {
    args: [
      "--chatter",
      "minimal",
      "-X",
      "compile",
      "--untrusted",
      "--keep-logs",
      "exam.tex",
    ],
    stdout: "piped",
    stderr: "piped",
    cwd: workingDir,
  });

  const child = cmd.spawn();
  const stderrStr = await new Response(child.stderr).text();

  const status = await child.status;
  if (!status.success) {
    const errorLines = stderrStr.slice(stderrStr.indexOf("error:"));
    throw new LatexCompileError(
      `tectonic exit code ${status.code}; error during compilation: ${errorLines}`,
      workingDir + "/aufgaben.tex",
    );
  }

  try {
    const pdfBytes = await Deno.readFile(examPdfPath);
    const logContent = await Deno.readTextFile(examLogPath);
    return { pdfBytes, logContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LatexCompileError(
      "Failed to read PDF or log file: " + message,
    );
  }
}

export async function renderMetaStudent(
  options: {
    zeigeloesung?: "yes" | "no";
    sprache?: string;
    randomexamnumber?: string;
    sequenznummer?: number;
    vollername?: string;
    matrikelnummer?: number;
  } = {},
  workingDir: string,
) {
  const data = {
    zeigeloesung: options.zeigeloesung === "yes" ? "yes" : "no",
    sprache: options.sprache || DEFAULT_INDIVIDUAL_META.sprache,
    randomexamnumber: options.randomexamnumber ||
      DEFAULT_INDIVIDUAL_META.randomexamnumber,
    sequenznummer: String(
      options.sequenznummer ?? DEFAULT_INDIVIDUAL_META.sequenznummer,
    ),
    vollername: escapeLatexWithSpaces(options.vollername) ||
      DEFAULT_INDIVIDUAL_META.vollername,
    matrikelnummer: String(
      options.matrikelnummer ?? DEFAULT_INDIVIDUAL_META.matrikelnummer,
    ),
  };
  const metaOutputPath = `${workingDir}/meta-individual.tex`;
  const rendered = getEta().render("meta-individual", data);

  if (typeof rendered !== "string") {
    throw new Error("Failed to render meta-individual template");
  }

  await Deno.writeTextFile(metaOutputPath, rendered);
}

export async function renderMetaExam(
  exam: Exam,
  workingDir: string,
) {
  const { courseName, examinerName, semester, date, examLengthMinutes } = exam;
  const points = exam.tasks.reduce(
    (acc, group) =>
      acc +
      (group.tasks.reduce((acc, task) => acc + (task.points ?? 0), 0) ?? 0),
    0,
  );

  const data: ExamMetaTemplateData = {
    ...DEFAULT_EXAM_META,
    veranstaltung: escapeLatexWithSpaces(courseName),
    semester: escapeLatexWithSpaces(semester),
    pruefer: escapeLatexWithSpaces(examinerName),
    datum: date,
    duration: String(examLengthMinutes ?? DEFAULT_EXAM_META.duration),
    points,
  };

  const metaOutputPath = `${workingDir}/meta-exam.tex`;
  const rendered = getEta().render("meta-exam", data);

  if (typeof rendered !== "string") {
    throw new Error("Failed to render meta-exam template");
  }

  await Deno.writeTextFile(metaOutputPath, rendered);
}

export async function generateTasksLatex(
  exam: Exam,
  workingDir: string,
  dest: string,
  options: RenderOptions,
): Promise<void> {
  const taskGroups = exam.tasks; // get the array of task groups
  const offenses = checkForInvalidPageBreaks(taskGroups);
  if (offenses.length > 0) {
    throw new InvalidPageBreakError(
      `Exam contains ${offenses.length} invalid page breaks`,
      offenses,
    );
  }

  let latexContent = "";

  // iterate over each task group
  for (let g = 0; g < taskGroups.length; g++) {
    const group = taskGroups[g];
    group.points = group.tasks.reduce(
      (acc, task) => acc + (task.points ?? 0),
      0,
    );

    latexContent += `%% MARKER: {"group": ${
      g + 1
    }, "task": -1, "type": "heading"}\n`;
    // start a main task (\aufgabe) for the group
    latexContent += `${getTaskRenderer().renderTaskHeading(group)}\n`;

    // iterate over the sub-tasks within this group
    for (let t = 0; t < group.tasks.length; t++) {
      const subTask = group.tasks[t];
      latexContent += `%% MARKER: {"group": ${g + 1}, "task": ${
        t + 1
      }, "type": "${subTask.type}"}\n`;
      // handle newPage differently since its not really a task
      // case for a createPage in between subtasks
      if (subTask.type === "newPage") {
        latexContent += `\\clearpage\n`;
        continue;
      }

      const questionDE = subTask.question.DE;
      const questionEN = subTask.question.EN;

      if (subTask.type === "manualText") {
        // Handle manual text task separately because it does not start with "\aufgabenteil"
        latexContent += `\\manualText\n`;
        latexContent += `{${escapeLatex(questionDE)}}\n`;
        latexContent += `{${escapeLatex(questionEN)}}\n\n`;
        continue; // skip to the next sub-task
      }

      // start a sub-task
      latexContent += `${getTaskRenderer().renderSubTaskStart(subTask)}\n`;

      // --- handle multiple choice task ---
      if (subTask.type === "multipleChoice" && subTask.answerOptions) {
        const rendered = getTaskRenderer().renderMultipleChoice(subTask, {
          solution: options.solution,
        });
        latexContent += `${rendered}\n\n`;
      } // --- handle short answer task ---
      else if (subTask.type === "shortAnswer" && subTask.solution) {
        const rendered = getTaskRenderer().renderMultilineText(
          subTask,
          {
            solution: options.solution,
          },
        );
        latexContent += `${rendered}\n\n`;
      } // --- handle latex task ---
      else if (subTask.type === "latex") {
        // Insert raw LaTeX content directly
        if (subTask.questionLatex?.DE) {
          latexContent += subTask.questionLatex.DE + "\n\n";
        }
        if (subTask.questionLatex?.EN) {
          latexContent += subTask.questionLatex.EN + "\n\n";
        }
      } else if (subTask.type === "pictureTask") {
        // copy the images to the img folder
        const questionImageName = subTask.questionPicture.urlDE
          .split("/")
          .pop();
        const solutionImageName = subTask.solutionPicture.urlDE
          .split("/")
          .pop();
        await Deno.copyFile(
          subTask.questionPicture.urlDE,
          `${workingDir}/img/${questionImageName}`,
        );
        await Deno.copyFile(
          subTask.solutionPicture.urlDE,
          `${workingDir}/img/${solutionImageName}`,
        );

        latexContent += `\\bildAufgabe{}`;
        latexContent +=
          `{1.0\\textwidth}{img/${questionImageName}}{img/${solutionImageName}}\n`;
        latexContent += `\\manualText{${
          subTask.questionPicture.altTextDE || ""
        }}{${subTask.questionPicture.altTextEN || ""}}\n\n`;
      } else if (subTask.type === "table") {
        if (!subTask.tableDataQuestion || !subTask.tableDataSolution) {
          console.warn("Table task missing data:", subTask.taskId);
          continue; // skip this task if data is missing
        }
        const numberOfRows = subTask.tableDataQuestion[0].length;
        const numberOfColumns = subTask.tableDataQuestion.length;

        let tableFormat = ""; // e.g. "|l|l|l|l|l|l"
        for (let i = 0; i < numberOfRows; i++) {
          tableFormat += "|l";
        }

        //find longest solution text to set the column width
        const longestSolution = subTask.tableDataSolution
          .map((col) =>
            col.reduce((maxLength, cell) =>
              maxLength.DE.length > cell.DE.length ? maxLength : cell
            )
          )
          .reduce((maxLength, cell) =>
            maxLength.DE.length > cell.DE.length ? maxLength : cell
          ).DE.length;

        latexContent += `\\begin{center}\n`;
        latexContent += `\\begin{tabular}`;
        latexContent += `{${tableFormat}|}\n`;

        latexContent += `\\hline\n`;

        for (let i = 0; i < numberOfColumns; i++) {
          latexContent += `%line ${i + 1}\n`;
          for (let j = 0; j < numberOfRows; j++) {
            // add & between columns
            latexContent += j === 0 ? "" : " & ";

            latexContent += `\\lineloesung`;
            if (subTask.tableDataQuestion[i][j].DE) {
              latexContent += `{${
                escapeLatex(subTask.tableDataQuestion[i][j].DE)
              }}`;
            } else {
              latexContent += `{${"~".repeat(longestSolution)}}`;
            }
            latexContent += `{ ${
              escapeLatex(subTask.tableDataSolution[i][j].DE)
            } }`;
          }
          latexContent += ` \\\\ \\hline\n`;
        }

        latexContent += `\\end{tabular}\n`;
        latexContent += `\\end{center}\n\n`;
      }

      latexContent += `${getTaskRenderer().renderSubTaskEnd()}\n`;

      latexContent += "\n";
    }
  }

  // console.log("Generated tasks:\n", latexContent);
  await Deno.writeTextFile(
    dest,
    latexContent,
  );
}

function checkForInvalidPageBreaks(taskGroups: TaskGroup[]): string[] {
  const offenses: string[] = [];
  for (let g = 0; g < taskGroups.length; g++) {
    if (taskGroups[g].tasks[0].type === "newPage") {
      offenses.push(`Assignment ${g + 1} contains a newPage as first item`);
    }
    for (let t = 1; t < taskGroups[g].tasks.length; t++) {
      if (
        taskGroups[g].tasks[t].type === "newPage" &&
        taskGroups[g].tasks[t - 1].type === "newPage"
      ) {
        offenses.push(
          `Assignment ${g + 1} contains two newPage items at position ${t}`,
        );
      }
    }
  }
  return offenses;
}
