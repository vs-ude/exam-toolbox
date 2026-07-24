import { getConfig, QRConfig } from '../config/mod.ts';
import { escapeLatex, getEta } from '../services/mod.ts';
import { generateExamQR } from '../services/qr.ts';
import { type Exam, Language, Student, TaskGroup } from '../types/mod.ts';
import {
  InvalidPageBreakError,
  LatexCompileError,
  LatexRenderError,
} from './err.ts';
import { getTaskRenderer, type RenderOptions } from './taskRenderer.ts';

const config = getConfig();

type ExamMetaTemplateData = {
  veranstaltung: string;
  semester: string;
  pruefer: string;
  datum: string;
  duration: string;
  schmierblaetteranzahl: number;
  englishandgerman: string;
  points: number;
  pageCount: number;
  qrCachePath: string;
  hasCustomLatexTask: boolean;
};

type IndividualMetaTemplateData = {
  zeigeloesung: string;
  sprache: Language;
  randomexamnumber: string;
  sequenznummer: string;
  vollername: string;
  matrikelnummer: string;
};

const DEFAULT_EXAM_META: ExamMetaTemplateData = {
  veranstaltung: 'Probeklausur\\ 2021',
  semester: 'WS\\ 2020/21',
  pruefer: 'Prof.\\ Dr.-Ing.\\ T.\\ Weis',
  datum: '2021-02-01',
  duration: '90',
  schmierblaetteranzahl: 2,
  englishandgerman: 'yes',
  points: 42,
  pageCount: 4,
  qrCachePath: QRConfig.cachePath,
  hasCustomLatexTask: false,
};

const DEFAULT_INDIVIDUAL_META: IndividualMetaTemplateData = {
  zeigeloesung: 'no',
  sprache: 'DE',
  randomexamnumber: 'R4ND',
  sequenznummer: '6',
  vollername: 'Tom\\ Morello',
  matrikelnummer: '100000',
};

function escapeLatexWithSpaces(text?: string): string {
  return escapeLatex(text).replace(/ /g, '\\ ');
}

// Executes tectonic to compile a .tex file and returns the resulting pdf and log file
export async function compileExam(
  workingDir: string,
): Promise<{ pdfBytes: Uint8Array; logContent: string }> {
  const examPdfPath = `${workingDir}/exam.pdf`;
  const examLogPath = `${workingDir}/exam.log`;

  const cmd = new Deno.Command('tectonic', {
    args: [
      '--chatter',
      'minimal',
      '-X',
      'compile',
      '--untrusted',
      '--keep-logs',
      'exam.tex',
    ],
    stdout: 'piped',
    stderr: 'piped',
    cwd: workingDir,
  });

  const child = cmd.spawn();
  const stderrStr = await new Response(child.stderr).text();

  const status = await child.status;
  if (!status.success) {
    const errorLines = stderrStr.slice(stderrStr.indexOf('error:'));
    throw new LatexCompileError(
      `tectonic exit code ${status.code}; error during compilation: ${errorLines}`,
      workingDir + '/aufgaben.tex',
    );
  }

  try {
    const pdfBytes = await Deno.readFile(examPdfPath);
    const logContent = await Deno.readTextFile(examLogPath);
    return { pdfBytes, logContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LatexCompileError('Failed to read PDF or log file: ' + message);
  }
}

export async function renderMetaStudent(
  student: Student,
  options: {
    zeigeloesung?: 'yes' | 'no';
    sprache?: Language;
  } = {},
  workingDir: string,
) {
  const sprache = options.sprache ?? DEFAULT_INDIVIDUAL_META.sprache;
  const data = {
    zeigeloesung: options.zeigeloesung === 'yes' ? 'yes' : 'no',
    sprache,
    randomexamnumber:
      student.codes[sprache] || DEFAULT_INDIVIDUAL_META.randomexamnumber,
    sequenznummer: String(
      student.sequenceNumber ?? DEFAULT_INDIVIDUAL_META.sequenznummer,
    ),
    vollername:
      escapeLatexWithSpaces(student.name) || DEFAULT_INDIVIDUAL_META.vollername,
    matrikelnummer: String(
      student.matriculation ?? DEFAULT_INDIVIDUAL_META.matrikelnummer,
    ),
  };
  const metaOutputPath = `${workingDir}/student.tex`;
  const rendered = getEta(config.paths.templateBase).render('student', data);

  if (typeof rendered !== 'string') {
    throw new Error('Failed to render student metadata template');
  }

  await Deno.writeTextFile(metaOutputPath, rendered);
}

export async function renderMetaExam(exam: Exam, workingDir: string) {
  if (!exam.points || !exam.pageCount) {
    exam.fillMeta();
  }

  const data: ExamMetaTemplateData = {
    ...DEFAULT_EXAM_META,
    veranstaltung: escapeLatexWithSpaces(exam.courseName),
    semester: escapeLatexWithSpaces(exam.semester),
    pruefer: escapeLatexWithSpaces(exam.examinerName),
    datum: exam.date,
    duration: String(exam.examLengthMinutes ?? DEFAULT_EXAM_META.duration),
    points: exam.points!,
    pageCount: exam.pageCount!,
    schmierblaetteranzahl: exam.conceptPages!,
    qrCachePath: QRConfig.cachePath,
    hasCustomLatexTask: exam.tasks.some(t =>
      t.tasks.some(t => t.type === 'latex'),
    ),
  };

  const metaOutputPath = `${workingDir}/exam.tex`;
  const rendered = getEta(config.paths.templateBase).render('exam', data);

  if (typeof rendered !== 'string') {
    throw new Error('Failed to render exam template');
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

  let latexContent = '';

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
      if (subTask.type === 'newPage') {
        latexContent += `\\clearpage\n`;
        continue;
      }

      if (subTask.type === 'manualText') {
        latexContent +=
          getTaskRenderer().renderManualText(subTask.question) + '\n';
        continue; // skip to the next sub-task
      }

      // start a sub-task
      latexContent += getTaskRenderer().renderSubTaskStart(subTask) + '\n';

      switch (subTask.type) {
        case 'multipleChoice':
          if (subTask.answerOptions) {
            latexContent += getTaskRenderer().renderMultipleChoice(subTask, {
              solution: options.solution,
            });
          }
          +'\n';
          break;
        case 'shortAnswer':
          if (subTask.solution) {
            latexContent +=
              getTaskRenderer().renderMultilineText(subTask, {
                solution: options.solution,
              }) + '\n';
          }
          break;
        case 'latex':
          // Insert raw LaTeX content directly
          if (subTask.questionLatex?.DE) {
            latexContent += subTask.questionLatex.DE + '\n\n';
          }
          if (subTask.questionLatex?.EN) {
            latexContent += subTask.questionLatex.EN + '\n\n';
          }
          break;
        case 'pictureTask':
          latexContent +=
            getTaskRenderer().renderPictureTask(subTask, {
              solution: options.solution,
              workingDir: workingDir,
            }) + '\n';
          break;
        case 'table':
          if (!subTask.tableDataQuestion || !subTask.tableDataSolution) {
            throw new LatexRenderError(
              `Assignment ${g + 1} table task at position ${
                t + 1
              } is missing data`,
            );
          }
          latexContent +=
            getTaskRenderer().renderTableTask(subTask, {
              solution: options.solution,
            }) + '\n';
          break;
      }

      latexContent += `${getTaskRenderer().renderSubTaskEnd()}\n`;

      latexContent += '\n';
    }
  }

  // console.log("Generated tasks:\n", latexContent);
  await Deno.writeTextFile(dest, latexContent);
}

function checkForInvalidPageBreaks(taskGroups: TaskGroup[]): string[] {
  const offenses: string[] = [];
  for (let g = 0; g < taskGroups.length; g++) {
    if (taskGroups[g].tasks.length === 0) continue;
    if (taskGroups[g].tasks[0].type === 'newPage') {
      offenses.push(`Assignment ${g + 1} contains a newPage as first item`);
    }
    for (let t = 1; t < taskGroups[g].tasks.length; t++) {
      if (
        taskGroups[g].tasks[t].type === 'newPage' &&
        taskGroups[g].tasks[t - 1].type === 'newPage'
      ) {
        offenses.push(
          `Assignment ${g + 1} contains two newPage items at position ${t}`,
        );
      }
    }
  }
  return offenses;
}

export async function generateSolution(tempDir: string, exam: Exam) {
  const tasksPath = `${tempDir}/aufgaben.tex`;
  await renderMetaExam(exam, tempDir);
  const student = new Student();
  await generateExamQR(
    `${tempDir}/img/mainQr.png`,
    exam,
    'DE',
    student.codes.DE,
  );
  await renderMetaStudent(
    student,
    {
      zeigeloesung: 'yes',
      sprache: 'DE',
    },
    tempDir,
  );
  await generateTasksLatex(exam, tempDir, tasksPath, { solution: true });
}
