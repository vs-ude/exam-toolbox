import { Exam } from "./exam.ts";

// executes pdflatex to compile a .tex file and returns the resulting pdf and log file
export async function generateExam(
  workingDir: string,
): Promise<{ pdfBytes: Uint8Array; logContent: string }> {
  const examTexPath = `${workingDir}/exam.tex`;
  const examPdfPath = `${workingDir}/exam.pdf`;
  const examLogPath = `${workingDir}/exam.log`;

  try {
    // runs pdflatex three times to ensure all cross-references (like page numbers) are resolved correctly
    for (let i = 0; i < 3; i++) {
      const cmd = new Deno.Command("pdflatex", {
        args: [
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-output-directory",
          workingDir,
          examTexPath,
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout, stderr } = await cmd.output();
      const stderrStr = new TextDecoder().decode(stderr);

      if (stderrStr) {
        console.error(
          `pdflatex pass ${i + 1} errors in ${workingDir}:\n${stderrStr}`,
        );
      }
    }

    try {
      await Deno.stat(examPdfPath);
    } catch (err) {
      throw new Error("PDF output file was not generated");
    }

    const pdfBytes = await Deno.readFile(examPdfPath);
    const logContent = await Deno.readTextFile(examLogPath);
    return { pdfBytes, logContent };
  } catch (error) {
    console.error("Error during PDF generation:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
}

// reads the latex template and replaces placeholders with dynamic data
export async function updateMetaStudent(
  options: {
    zeigeloesung?: "yes" | "no";
    sprache?: string;
    randomexamnumber?: string;
    sequenznummer?: number;
    vollername?: string;
    matrikelnummer?: number;
    uploadurl?: string;
  } = {},
  workingDir: string,
) {
  const {
    zeigeloesung,
    sprache,
    randomexamnumber,
    sequenznummer,
    vollername,
    matrikelnummer,
    uploadurl,
  } = options;
  const metaPath = `${workingDir}/meta-exam.tex`;

  const metaTemplate = await Deno.readTextFile(metaPath);

  const updatedMeta = metaTemplate
    .replace(
      /\\newcommand\{\\zeigeloesung\}\{.*?\}/,
      `\\newcommand{\\zeigeloesung}{${zeigeloesung === "yes" ? "yes" : "no"}}`,
    )
    .replace(
      /\\newcommand\{\\sprache\}\{.*?\}/,
      `\\newcommand{\\sprache}{${sprache || "de"}}`,
    )
    .replace(
      /\\newcommand\{\\randomexamnumber\}\{.*?\}/,
      `\\newcommand{\\randomexamnumber}{${randomexamnumber || "7PYT"}}`,
    )
    .replace(
      /\\newcommand\{\\sequenznummer\}\{.*?\}/,
      `\\newcommand{\\sequenznummer}{${sequenznummer || "6"}}`,
    )
    .replace(
      /\\newcommand\{\\vollername\}\{.*?\}/,
      `\\newcommand{\\vollername}{${vollername ? vollername.replace(/ /g, "\\ ") : "Tom\ Morello"}}`,
    )
    .replace(
      /\\newcommand\{\\matrikelnummer\}\{.*?\}/,
      `\\newcommand{\\matrikelnummer}{${matrikelnummer || "3120434"}}`,
    )
    .replace(
      /\\newcommand\{\\uploadurl\}\{.*?\}/,
      `\\newcommand{\\uploadurl}{${uploadurl || "aklsjdhflkjashdflkjahsdf"}}`,
    );

  await Deno.writeTextFile(metaPath, updatedMeta);
}

export async function updateMetaTemplate(exam: Exam, workingDir: string) {
  const metaPath = `${workingDir}/meta-exam.tex`;
  const { courseName, examinerName, semester, date, examLengthMinutes, tasks } =
    exam;
  const metaTemplate = await Deno.readTextFile(metaPath);
  const updatedMeta = metaTemplate
    .replace(
      /\\newcommand\{\\veranstaltung\}\{.*?\}/,
      `\\newcommand{\\veranstaltung}{ ${courseName.replace(/([#\$%&_\{\}~^\\ ])/g, "\\$1")} }`,
    )
    .replace(
      /\\newcommand\{\\semester\}\{.*?\}/,
      `\\newcommand{\\semester}{${semester.replace(/ /g, "\\ ")}}`,
    )
    .replace(
      /\\newcommand\{\\pruefer\}\{.*?\}/,
      `\\newcommand{\\pruefer}{${examinerName.replace(/([#\$%&_\{\}~^\\ ])/g, "\\$1")}}`,
    )
    .replace(
      /\\newcommand\{\\datum\}\{.*?\}/,
      `\\newcommand{\\datum}{${date}}`,
    );
  await Deno.writeTextFile(metaPath, updatedMeta);
}

function escapeLatex(text?: string): string {
  if (!text) return "";
  return text.replace(/([&%$#_{}~^\\])/g, "\\$1");
}

export async function generateTasksLatex(
  exam: Exam,
  workingDir: string,
): Promise<string> {
  console.log(exam);
  await clearLatexIMGFolder(workingDir); // remove old images from previous runs

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
    latexContent += `\\aufgabe{${escapeLatex(groupTitleDE)}}{${escapeLatex(groupTitleEN)}}\n\n`;

    // iterate over the sub-tasks within this group
    for (let subTask of group.tasks) {
      // handle newPage differently since its not really a task
      // case for a creaPage inbetween subtasks
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
        const answerOptions = subTask.answerOptions;
        const correctAnswersCount = answerOptions.filter(
          (opt) => opt.correct,
        ).length; // calculate points per correct answer
        const totalMcPoints = subTask.points;

        latexContent += `\\fortype{A}{\n`;
        latexContent += `\\mcstart[${totalMcPoints}]{${correctAnswersCount}}\n`; // use total points for the question

        answerOptions.forEach((option) => {
          const de = escapeLatex(option.DE);
          const en = escapeLatex(option.EN);
          const correctness = option.correct ? "w" : "f";
          latexContent += `\\mcline{${de}}{${en}}{${correctness}}\n`;
        });

        latexContent += `\\mcend\n}\n\n`; // end fortype and add newline
      }

      // --- handle short answer task ---
      else if (subTask.type === "shortAnswer" && subTask.solution) {
        const solutionDE = escapeLatex(subTask.solution.DE);
        const solutionEN = escapeLatex(subTask.solution.EN);

        // Estimates number of lines needed based on the solution. Better more lines than less.
        const numberLnDE = Math.max(3, Math.ceil(solutionDE.length / 50));
        const numberLnEN = Math.max(3, Math.ceil(solutionEN.length / 50));
        const numberLn = Math.max(numberLnDE, numberLnEN);

        latexContent += `\\loesung{${numberLn}}{${solutionDE} / ${solutionEN}}\n\n`;
      }

      // --- handle latex task ---
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
        latexContent += `{1.0\\textwidth}{img/${questionImageName}}{img/${solutionImageName}}\n`;
        latexContent += `\\manualText{${subTask.questionPicture.altTextDE || ""}}{${subTask.questionPicture.altTextEN || ""}}\n\n`;
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
              maxLength.DE.length > cell.DE.length ? maxLength : cell,
            ),
          )
          .reduce((maxLength, cell) =>
            maxLength.DE.length > cell.DE.length ? maxLength : cell,
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
              latexContent += `{${escapeLatex(subTask.tableDataQuestion[i][j].DE)}}`;
            } else {
              latexContent += `{${"~".repeat(longestSolution)}}`;
            }
            latexContent += `{ ${escapeLatex(subTask.tableDataSolution[i][j].DE)} }`;
          }
          latexContent += ` \\\\ \\hline\n`;
        }

        latexContent += `\\end{tabular}\n`;
        latexContent += `\\end{center}\n\n`;
      }

      latexContent += "\\aufgabenteilende\n\n\n";
    }
  }
  return latexContent;
}

export async function clearLatexIMGFolder(workingDir: string) {
  try {
    const imgPath = `${workingDir}/img`;
    for await (const entry of Deno.readDir(imgPath)) {
      if (
        entry.isFile &&
        ![
          "kreuze.png",
          "Unilogo.jpg",
          "vslogo.png",
          "background-svg.pdf",
          "background-svg-muster.pdf",
          "background-svg-muster-first.pdf",
        ].includes(entry.name)
      ) {
        await Deno.remove(`${imgPath}/${entry.name}`);
      }
    }
  } catch (error) {
    console.error("Error clearing latex img folder:", error);
  }
}
