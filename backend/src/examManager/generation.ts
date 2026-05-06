import type { Exam } from "./exam.ts";
import { getTaskRenderer, type RenderOptions } from "./taskRenderer.ts";
import { escapeLatex, getEta } from "../services/mod.ts";
import { LatexCompileError } from "./err.ts";

type ExamMetaTemplateData = {
  veranstaltung: string;
  semester: string;
  pruefer: string;
  datum: string;
  duration: string;
  schmierblaetteranzahl: string;
  englishandgerman: string;
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
    );
  }

  try {
    const pdfBytes = await Deno.readFile(examPdfPath);
    const logContent = await Deno.readTextFile(examLogPath);
    return { pdfBytes, logContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LatexCompileError("Failed to read PDF or log file: " + message);
  }
}

export async function updateMetaStudent(
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

export async function updateMetaExam(
  exam: Exam,
  workingDir: string,
) {
  const { courseName, examinerName, semester, date, examLengthMinutes } = exam;

  const data: ExamMetaTemplateData = {
    ...DEFAULT_EXAM_META,
    veranstaltung: escapeLatexWithSpaces(courseName),
    semester: escapeLatexWithSpaces(semester),
    pruefer: escapeLatexWithSpaces(examinerName),
    datum: date,
    duration: String(examLengthMinutes ?? DEFAULT_EXAM_META.duration),
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
  let latexContent = "";

  // iterate over each task group
  for (let group of taskGroups) {
    // newPage is in the tasks list but its not really a task (need to be handles differently)
    // case for group with just newPage in it
    if (group.tasks.length === 1 && group.tasks[0].type === "newPage") {
      latexContent += `\\clearpage\n\n`;
      continue;
    }

    const groupTitleDE = group.groupTitle.DE;
    const groupTitleEN = group.groupTitle.EN;

    // start a main task (\aufgabe) for the group
    latexContent += `\\aufgabe{${escapeLatex(groupTitleDE)}}{${
      escapeLatex(groupTitleEN)
    }}\n\n`;

    // iterate over the sub-tasks within this group
    for (let subTask of group.tasks) {
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

      // start a sub-task (\aufgabenteil)
      latexContent += `\\aufgabenteil{${subTask.points ?? 0}}\n`;
      latexContent += `{${escapeLatex(questionDE)}}\n`;
      latexContent += `{${escapeLatex(questionEN)}}\n\n`;

      // --- handle multiple choice task ---
      if (subTask.type === "multipleChoice" && subTask.answerOptions) {
        const rendered = getTaskRenderer().renderMultipleChoice(subTask, {
          solution: options.solution,
        });
        latexContent += `${rendered}\n\n`;
      } // --- handle short answer task ---
      else if (subTask.type === "shortAnswer" && subTask.solution) {
        const solutionDE = escapeLatex(subTask.solution.DE);
        const solutionEN = escapeLatex(subTask.solution.EN);

        // Estimates number of lines needed based on the solution. Better more lines than less.
        const numberLnDE = Math.max(3, Math.ceil(solutionDE.length / 50));
        const numberLnEN = Math.max(3, Math.ceil(solutionEN.length / 50));
        const numberLn = Math.max(numberLnDE, numberLnEN);

        latexContent +=
          `\\loesung{${numberLn}}{${solutionDE} / ${solutionEN}}\n\n`;
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

      latexContent += "\\aufgabenteilende\n\n\n";
    }
  }

  await Deno.writeTextFile(
    dest,
    latexContent,
  );
}
