import { type Eta } from '@bgub/eta';
import { escapeLatex, getEta } from '../services/mod.ts';
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
} from '../types/exam.ts';
import { getConfig } from '../config/mod.ts';
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
        {
          cause: err instanceof Error ? err.message : 'unknown error',
        },
      );
    }
    if (typeof rendered !== 'string') {
      throw new LatexRenderError(`Failed to render ${template} template`, {
        cause: rendered,
      });
    }
    return rendered;
  }

  renderTaskHeading(group: TaskGroup): string {
    const data: HeadingTemplateData = {
      id: String(group.groupNumber),
      title: {
        DE: escapeLatex(group.groupTitle.DE),
        EN: escapeLatex(group.groupTitle.EN),
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
        DE: escapeLatex(task.question.DE),
        EN: escapeLatex(task.question.EN),
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
            opt.DE.length <= maxLenCondensed &&
            opt.EN.length <= maxLenCondensed,
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
        DE: escapeLatex(opt.DE),
        EN: escapeLatex(opt.EN),
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
      const escaped = escapeLatex(val);
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
    const taskPath =
      'img/' +
      copyUrlToPath(options.workingDir + '/img', task.questionPicture.urlDE);
    const solutionPath =
      'img/' +
      copyUrlToPath(options.workingDir + '/img', task.solutionPicture.urlDE);
    return this.renderPictureTaskImpl(task, options, taskPath, solutionPath);
  }

  renderPictureTaskImpl(
    task: PictureTask,
    options: RenderOptionsWithAux,
    taskPath: string,
    solutionPath: string,
  ): string {
    const taskText = task.questionPicture.altTextDE
      ? {
          DE: task.questionPicture.altTextDE,
          EN: task.questionPicture.altTextEN ?? task.questionPicture.altTextDE,
        }
      : undefined;

    const data: PictureTaskTemplateData = {
      solution: options.solution ?? false,
      lang: options.lang ?? 'DE',
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
          maxLength.DE.length > cell.DE.length ? maxLength : cell,
        ),
      )
      .reduce((maxLength, cell) =>
        maxLength.DE.length > cell.DE.length ? maxLength : cell,
      ).DE.length;

    const hasHeaders = subTask.tableHeadersSolution[0].DE ?? false;
    const tableData: TableTaskTemplateData = {
      solution,
      lang: options.lang ?? 'DE',
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
        throw new LatexRenderError('Line options do not match header length', {
          cause: `(options) ${line.options.length} !== ${
            task.header.length - 1
          } (header - 1)`,
        });
      }
    });
    if (task.header.length - 1 > 4) {
      throw new LatexRenderError(
        'Cannot render more than 4 options in PropertyLines',
        { cause: `${task.header.length - 1} options requested` },
      );
    }
    const pointsPerCorrect = Math.round(task.points / task.lines.length);

    const data: PropertyTaskTemplateData = {
      solution: options.solution ?? false,
      lang: options.lang ?? 'DE',
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
  answerOptions: { DE: string; EN: string; correct: 'w' | 'f' }[];
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
