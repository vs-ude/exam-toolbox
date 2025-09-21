import { Exam } from "./exam.ts"

function escapeLatex(text?: string): string {
  if (!text) return ""
  return text.replace(/([&%$#_{}~^\\])/g, '\\$1')
}

export async function generateTasksLatex(exam: Exam, workingDir: string): Promise<string> {
  console.log(exam)
  await clearLatexIMGFolder(workingDir) // remove old images from previous runs

  const taskGroups = exam.tasks // get the array of task groups
  let latexContent = ""

  // iterate over each task group
  for (let group of taskGroups) {

    // newPage is in the tasks list but its not really a task (need to be handles differently)
    // case for group with just newPage in it
    if (group.tasks.length === 1 && group.tasks[0].type === "newPage"){
      latexContent += `\\clearpage\n\n`
      continue
    }

    const groupTitleDE = group.groupTitle.DE
    const groupTitleEN = group.groupTitle.EN

    // start a main task (\aufgabe) for the group
    latexContent += `\\aufgabe{${escapeLatex(groupTitleDE)}}{${escapeLatex(groupTitleEN)}}\n\n`;

    // iterate over the sub-tasks within this group
    for (let subTask of group.tasks) {

      // handle newPage differently since its not really a task
      // case for a creaPage inbetween subtasks
      if (subTask.type === "newPage") {
      latexContent += `\\clearpage\n`
      continue
    }

      const questionDE = subTask.question.DE
      const questionEN = subTask.question.EN

      if (subTask.type === "manualText") {
        // Handle manual text task separately because it does not start with "\aufgabenteil"
        latexContent += `\\manualText\n`
        latexContent += `{${escapeLatex(questionDE)}}\n`
        latexContent += `{${escapeLatex(questionEN)}}\n\n`
        continue; // skip to the next sub-task
      }

      // start a sub-task (\aufgabenteil)
      latexContent += `\\aufgabenteil{${subTask.points ?? 0}}\n`
      latexContent += `{${escapeLatex(questionDE)}}\n`
      latexContent += `{${escapeLatex(questionEN)}}\n\n`

      // --- handle multiple choice task ---
      if (subTask.type === "multipleChoice" && subTask.answerOptions) {
        const answerOptions = subTask.answerOptions
        const correctAnswersCount = answerOptions.filter(opt => opt.correct).length // calculate points per correct answer
        const totalMcPoints = subTask.points

        latexContent += `\\fortype{A}{\n`
        latexContent += `\\mcstart[${totalMcPoints}]{${correctAnswersCount}}\n` // use total points for the question

        answerOptions.forEach(option => {
          const de = escapeLatex(option.DE)
          const en = escapeLatex(option.EN)
          const correctness = option.correct ? "w" : "f"
          latexContent += `\\mcline{${de}}{${en}}{${correctness}}\n`
        });

        latexContent += `\\mcend\n}\n\n` // end fortype and add newline
      }

      // --- handle short answer task ---
      else if (subTask.type === "shortAnswer" && subTask.solution) {
        const solutionDE = escapeLatex(subTask.solution.DE)
        const solutionEN = escapeLatex(subTask.solution.EN)

        // Estimates number of lines needed based on the solution. Better more lines than less.
        const numberLnDE = Math.max(3, Math.ceil(solutionDE.length / 50))
        const numberLnEN = Math.max(3, Math.ceil(solutionEN.length / 50))
        const numberLn = Math.max(numberLnDE, numberLnEN)

        latexContent += `\\loesung{${numberLn}}{${solutionDE} / ${solutionEN}}\n\n`
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
      }

      else if (subTask.type === "pictureTask") {
        // copy the images to the img folder
        const questionImageName = subTask.questionPicture.urlDE.split('/').pop()
        const solutionImageName = subTask.solutionPicture.urlDE.split('/').pop()
        await Deno.copyFile(subTask.questionPicture.urlDE, `${workingDir}/img/${questionImageName}`)
        await Deno.copyFile(subTask.solutionPicture.urlDE, `${workingDir}/img/${solutionImageName}`)


        latexContent += `\\bildAufgabe{}`
        latexContent += `{0.3\\textwidth}{img/${questionImageName}}{img/${solutionImageName}}\n`
        latexContent += `\\manualText{${subTask.questionPicture.altTextDE || ""}}{${subTask.questionPicture.altTextEN || ""}}\n\n`
      }

      else if (subTask.type === "table") {
        if (!subTask.tableDataQuestion || !subTask.tableDataSolution) {
          console.warn("Table task missing data:", subTask.taskId);
          continue; // skip this task if data is missing
        }
        const numberOfRows = subTask.tableDataQuestion[0].length;
        const numberOfColumns = subTask.tableDataQuestion.length;

        let tableFormat = "";   // e.g. "|l|l|l|l|l|l"
        for (let i = 0; i < numberOfRows; i++) {
          tableFormat += "|l";
        }

        //find longest solution text to set the column width
        const longestSolution =
          subTask.tableDataSolution
            .map((col) =>
              col.reduce(
                (maxLength, cell) =>
                  maxLength.DE.length > cell.DE.length ? maxLength : cell
              )
            )
            .reduce(
              (maxLength, cell) =>
                maxLength.DE.length > cell.DE.length ? maxLength : cell
            ).DE.length;

        latexContent += `\\begin{center}\n`
        latexContent += `\\begin{tabular}`
        latexContent += `{${tableFormat}|}\n`

        latexContent += `\\hline\n`

        for (let i = 0; i < numberOfColumns; i++) {
          latexContent += `%line ${i + 1}\n`
          for (let j = 0; j < numberOfRows; j++) {

            // add & between columns
            latexContent += j === 0 ? "" : " & ";

            latexContent += `\\lineloesung`;
            if (subTask.tableDataQuestion[i][j].DE) {
              latexContent += `{${escapeLatex(subTask.tableDataQuestion[i][j].DE)}}`
            } else {
              latexContent += `{${"~".repeat(longestSolution)}}`;
            }
            latexContent += `{ ${escapeLatex(subTask.tableDataSolution[i][j].DE)} }`;
          }
          latexContent += ` \\\\ \\hline\n`
        }

        latexContent += `\\end{tabular}\n`
        latexContent += `\\end{center}\n\n`
      }

      latexContent += "\\aufgabenteilende\n\n\n";
    };

    // add a clearpage after each main task group if desired (optional)
    // latexContent += "\\clearpage\n\n";

  } // end of iterating through task groups

  console.log(latexContent) // uncomment for debugging
  return latexContent;
}


async function clearLatexIMGFolder(workingDir: string) {
  try {
    const imgPath = `${workingDir}/img`
    for await (const entry of Deno.readDir(imgPath)) {
      if (
        entry.isFile &&
        !["kreuze.png", "Unilogo.jpg", "vslogo.png", "background-svg.pdf", "background-svg-muster.pdf", "background-svg-muster-first.pdf"].includes(entry.name)
      ) {
        await Deno.remove(`${imgPath}/${entry.name}`);
      }
    }

  } catch (error) {
    console.error("Error clearing latex img folder:", error);
  }
}