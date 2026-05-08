import { type Eta } from "@bgub/eta";
import { escapeLatex, getEta } from "../services/mod.ts";
import type {
  BaseTask,
  MultipleChoiceTask,
  Question,
  ShortAnswerTask,
  TaskGroup,
  Translation,
} from "./exam.ts";
import { LatexRenderError } from "./err.ts";

let cachedTaskRenderer: TaskRenderer;

export function getTaskRenderer(): TaskRenderer {
  if (cachedTaskRenderer) return cachedTaskRenderer;

  cachedTaskRenderer = new TaskRenderer(getEta());
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
        `Failed to render ${template} template`,
        {
          cause: err,
        },
      );
    }
    if (typeof rendered !== "string") {
      throw new LatexRenderError(
        `Failed to render ${template} template`,
        {
          cause: rendered,
        },
      );
    }
    return rendered;
  }

  renderTaskHeading(
    group: TaskGroup,
  ): string {
    const data: HeadingTemplateData = {
      id: String(group.groupNumber),
      title: {
        DE: escapeLatex(group.groupTitle.DE),
        EN: escapeLatex(group.groupTitle.EN),
      },
      points: group.points,
      solution: false,
    };
    return this.render("task_types/taskHeading", data);
  }

  renderSubTaskStart(
    task: BaseTask,
  ): string {
    const data: TaskTemplateData = {
      points: task.points,
      question: {
        DE: escapeLatex(task.question.DE),
        EN: escapeLatex(task.question.EN),
      },
      solution: false,
    };
    return this.render("task_types/subTaskStart", data);
  }

  renderSubTaskEnd(): string {
    return this.render("task_types/subTaskEnd", { solution: false });
  }

  renderMultipleChoice(
    task: MultipleChoiceTask,
    options: RenderMultipleChoiceOptions,
  ): string {
    const numCorrect = task.numCorrect ??
      task.answerOptions.filter((option) => option.correct).length;
    const pointsPerCorrect = Math.round(task.points / numCorrect);

    let condensed = false;
    const maxLenCondensed = 16; // Empirically determined with 'M' characters
    if (task.answerOptions.length % 2 == 0) {
      if (
        task.answerOptions.every((opt) =>
          opt.DE.length <= maxLenCondensed && opt.EN.length <= maxLenCondensed
        )
      ) {
        condensed = true;
      }
    }
    const data: MultipleChoiceTemplateData = {
      points: task.points ?? 0,
      numCorrect,
      pointsPerCorrect,
      answerOptions: task.answerOptions.map((opt) => ({
        DE: escapeLatex(opt.DE),
        EN: escapeLatex(opt.EN),
        correct: opt.correct ? "w" : "f",
      })),
      solution: options.solution ?? false,
      condensed: condensed,
    };

    return this.render("task_types/multipleChoice", data);
  }

  renderMultilineText(
    task: ShortAnswerTask,
    options: RenderOptions,
  ): string {
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
      noLines: task.noLines == undefined || task.noLines == 0
        ? maxNoLines
        : task.noLines,
    };

    return this.render("task_types/multilineText", data);
  }
}

export type RenderOptions = {
  solution?: boolean;
  lang?: string;
};

type TemplateData = {
  points?: number;
  solution: boolean;
};

type RenderMultipleChoiceOptions = RenderOptions & {
  granularity?: number; /* Which point granularity to use, e.g. 0.5 or 0.25 */
};

type TaskTemplateData = TemplateData & {
  question: Question;
};

type HeadingTemplateData = TemplateData & {
  id: string;
  title: Translation;
};

type MultipleChoiceTemplateData = TemplateData & {
  numCorrect: number;
  pointsPerCorrect: number;
  answerOptions: { DE: string; EN: string; correct: "w" | "f" }[];
  condensed: boolean;
};

type MultilineTextTemplateData = TemplateData & {
  solutionText: string[];
  noLines: number;
};
