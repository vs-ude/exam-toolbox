import { type Eta } from "@bgub/eta";
import { escapeLatex, getEta } from "../services/mod.ts";
import type { MultipleChoiceTask, ShortAnswerTask } from "./exam.ts";
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

  renderMultipleChoice(
    task: MultipleChoiceTask,
    options: RenderMultipleChoiceOptions,
  ): string {
    const numCorrect = task.numCorrect ??
      task.answerOptions.filter((option) => option.correct).length;
    const modificator = 1 / (options.granularity ?? 0.5);
    const pointsPerCorrect = task.points
      ? Math.round(task.points / numCorrect * modificator) / modificator
      : 0;

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

type MultipleChoiceTemplateData = TemplateData & {
  numCorrect: number;
  pointsPerCorrect: number;
  answerOptions: { DE: string; EN: string; correct: "w" | "f" }[];
};

type MultilineTextTemplateData = TemplateData & {
  solutionText: string[];
  noLines: number;
};
