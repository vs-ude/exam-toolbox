import { type Eta } from '@bgub/eta';
import { getConfig } from '../config/mod.ts';
import { getEta, preprocessLatex } from '../services/mod.ts';
import type {
  BaseTask,
  Dimension,
  Language,
  MultipleChoiceTask,
  PictureTask,
  PropertyLine,
  PropertyTask,
  Question,
  ShortAnswerTask,
  TableTask,
  TaskGroup,
  Translation,
} from '../types/mod.ts';
import { LatexRenderError } from './err.ts';

const config = getConfig();
let cachedTaskRenderer: TaskRenderer;

export function getTaskRenderer(): TaskRenderer {
  if (cachedTaskRenderer) return cachedTaskRenderer;

  cachedTaskRenderer = new TaskRenderer(getEta(config.paths.templateBase));
  return cachedTaskRenderer;
}

export class TaskRenderer {
  constructor(private eta: Eta) {}

  private render(template: string, data: TemplateData): string {
    let rendered: string;
    try {
      rendered = this.eta.render(template, data);
    } catch (err) {
      throw new LatexRenderError(
        `Error during ${template} template rendering`,
        undefined,
        {
          cause: err instanceof Error ? err.message : 'unknown error',
        },
      );
    }
    if (typeof rendered !== 'string') {
      throw new LatexRenderError(
        `Failed to render ${template} template`,
        undefined,
        {
          cause: rendered,
        },
      );
    }
    return rendered;
  }

  renderTaskHeading(group: TaskGroup): string {
    const data: HeadingTemplateData = {
      id: String(group.groupNumber),
      title: {
        A: preprocessLatex(group.groupTitle.A),
        B: preprocessLatex(group.groupTitle.B),
      },
      points: group.points,
      solution: false,
    };
    return this.render('task_types/taskHeading', data);
  }

  renderSubTaskStart(task: BaseTask): string {
    const data: TaskTemplateData = {
      points: task.points,
      question: {
        A: preprocessLatex(task.question.A),
        B: preprocessLatex(task.question.B),
      },
      solution: false,
    };
    return this.render('task_types/subTaskStart', data);
  }

  renderSubTaskEnd(): string {
    return this.render('task_types/subTaskEnd', { solution: false });
  }

  renderMultipleChoice(
    task: MultipleChoiceTask,
    options: RenderMultipleChoiceOptions,
  ): string {
    const numCorrect =
      task.numCorrect ??
      task.answerOptions.filter(option => option.correct).length;
    const pointsPerCorrect = Math.round(task.points / numCorrect);

    let condensed = false;
    const maxLenCondensed = 16; // Empirically determined with 'M' characters
    if (task.answerOptions.length % 2 == 0) {
      if (
        task.answerOptions.every(
          opt =>
            opt.A.length <= maxLenCondensed && opt.B.length <= maxLenCondensed,
        )
      ) {
        condensed = true;
      }
    }
    const data: MultipleChoiceTemplateData = {
      points: task.points ?? 0,
      numCorrect,
      pointsPerCorrect,
      answerOptions: task.answerOptions.map(opt => ({
        A: preprocessLatex(opt.A),
        B: preprocessLatex(opt.B),
        correct: opt.correct ? 'w' : 'f',
      })),
      solution: options.solution ?? false,
      condensed: condensed,
    };

    return this.render('task_types/multipleChoice', data);
  }

  renderMultilineText(task: ShortAnswerTask, options: RenderOptions): string {
    const solutionTexts = [];
    let maxNoLines = 0;
    for (const val of Object.values(task.solution)) {
      const escaped = preprocessLatex(val);
      solutionTexts.push(escaped);
      maxNoLines = Math.max(maxNoLines, Math.ceil(escaped.length / 50));
    }

    const data: MultilineTextTemplateData = {
      solution: options.solution ?? false,
      solutionText: solutionTexts,
      noLines:
        task.noLines == undefined || task.noLines == 0
          ? maxNoLines
          : task.noLines,
    };

    return this.render('task_types/multilineText', data);
  }

  renderPictureTask(task: PictureTask, options: RenderOptionsWithAux): string {
    const taskUrl = task.questionPicture.url[options.lang ?? 'A'];
    const solutionUrl = task.solutionPicture.url[options.lang ?? 'A'];

    if (!taskUrl || !solutionUrl) {
      throw new LatexRenderError(
        'Missing task or solution image for this language!',
      );
    }

    const taskPath =
      'img/' + copyUrlToPath(options.workingDir + '/img', taskUrl);
    const solutionPath =
      'img/' + copyUrlToPath(options.workingDir + '/img', solutionUrl);
    return this.renderPictureTaskImpl(task, options, taskPath, solutionPath);
  }

  renderPictureTaskImpl(
    task: PictureTask,
    options: RenderOptionsWithAux,
    taskPath: string,
    solutionPath: string,
  ): string {
    const taskText = task.questionPicture.altText
      ? {
          A: task.questionPicture.altText.A,
          B: task.questionPicture.altText.B,
        }
      : undefined;

    const data: PictureTaskTemplateData = {
      solution: options.solution ?? false,
      lang: options.lang ?? 'A',
      taskPath: taskPath,
      solutionPath: solutionPath,
      text: taskText,
      dimension: task.size ? dimToLatex(task.size) : 'height=5cm',
    };

    return this.render('task_types/pictureTask', data);
  }

  renderManualText(text: Translation): string {
    const data: ManualTextTemplateData = { solution: false, text: text };
    return this.render('task_types/manualText', data);
  }

  renderTableTask(subTask: TableTask, options: RenderOptions): string {
    const solution = options.solution ?? false;

    const cellWidthInt = [subTask.tableHeadersSolution]
      .concat(subTask.tableDataSolution)
      .map(col =>
        col.reduce((maxLength, cell) =>
          maxLength.A.length > cell.A.length ? maxLength : cell,
        ),
      )
      .reduce((maxLength, cell) =>
        maxLength.A.length > cell.A.length ? maxLength : cell,
      ).A.length;

    const hasHeaders = subTask.tableHeadersSolution[0].A ?? false;
    const tableData: TableTaskTemplateData = {
      solution,
      lang: options.lang ?? 'A',
      header: hasHeaders ? subTask.tableHeadersSolution : [],
      cells: solution ? subTask.tableDataSolution : subTask.tableDataQuestion,
      columns: subTask.tableDataSolution[0].length,
      cellWidth: `${cellWidthInt}em`,
    };

    return this.render('task_types/tableTask', tableData);
  }

  renderPropertyTask(task: PropertyTask, options: RenderOptions): string {
    /* The header should have one name per box column and one for the texts */
    task.lines.forEach(line => {
      if (line.options.length !== task.header.length - 1) {
        throw new LatexRenderError(
          'Line options do not match header length',
          undefined,
          {
            cause: `(options) ${line.options.length} !== ${
              task.header.length - 1
            } (header - 1)`,
          },
        );
      }
    });
    if (task.header.length - 1 > 4) {
      throw new LatexRenderError(
        'Cannot render more than 4 options in PropertyLines',
        undefined,
        { cause: `${task.header.length - 1} options requested` },
      );
    }
    const pointsPerCorrect = Math.round(task.points / task.lines.length);

    const data: PropertyTaskTemplateData = {
      solution: options.solution ?? false,
      lang: options.lang ?? 'A',
      header: task.header,
      lines: task.lines,
      columns: task.lines[0].options.length, // substract the text header column
      pointsPerCorrect,
    };

    return this.render('task_types/propertyTask', data);
  }
}

export type RenderOptions = {
  solution?: boolean;
  lang?: Language;
};

type TemplateData = {
  points?: number;
  lang?: Language;
  solution: boolean;
};

type RenderMultipleChoiceOptions = RenderOptions & {
  granularity?: number; /* Which point granularity to use, e.g. 0.5 or 0.25 */
};

type RenderOptionsWithAux = RenderOptions & {
  workingDir: string;
};

type TaskTemplateData = TemplateData & {
  question: Question;
};

type HeadingTemplateData = TemplateData & {
  id: string;
  title: Translation;
};

type ManualTextTemplateData = TemplateData & {
  text: Translation;
};

type MultipleChoiceTemplateData = TemplateData & {
  numCorrect: number;
  pointsPerCorrect: number;
  answerOptions: { A: string; B: string; correct: 'w' | 'f' }[];
  condensed: boolean;
};

type PropertyTaskTemplateData = TemplateData & {
  header: Translation[];
  lines: PropertyLine[];
  columns: number;
  pointsPerCorrect: number;
};

type MultilineTextTemplateData = TemplateData & {
  solutionText: string[];
  noLines: number;
};

type PictureTaskTemplateData = TemplateData & {
  taskPath: string;
  solutionPath: string;
  text?: Translation;
  dimension: string;
};

type TableTaskTemplateData = TemplateData & {
  header: Translation[];
  cells: Translation[][];
  columns: number;
  cellWidth: string;
};

/* Copies the image from the given URL to the working directory and returns the name */
function copyUrlToPath(workingDir: string, url: string): string {
  const name = url.split('/').pop();
  Deno.copyFileSync(url, `${workingDir}/${name}`);
  return `${name}`;
}

function dimToLatex(dim: Dimension): string {
  const unit = dim.unit === 'relative' ? `\\text${dim.dimension}` : dim.unit;
  return `${dim.dimension}=${dim.scalar}${unit}`;
}
