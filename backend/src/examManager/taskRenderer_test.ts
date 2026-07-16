import { assertEquals } from '@std/assert';
import type { PictureTask, PropertyTask, TableTask } from '../types/mod.ts';

const TEMPLATE_PATH = './template';

const { TaskRenderer } = await import('./taskRenderer.ts');
const { getEta } = await import('../services/mod.ts');

Deno.test(
  'TaskRenderer.renderPictureTaskImpl renders picture task template',
  () => {
    const eta = getEta(TEMPLATE_PATH);
    const renderer = new TaskRenderer(eta);

    const task: PictureTask = {
      _id: 'task-1',
      type: 'pictureTask',
      question: { DE: 'Q', EN: 'Q' },
      points: 5,
      tagIds: [],
      tags: [],
      createdBy: 'user',
      createdAt: new Date(),
      lastUsed: new Date(),
      usedIn: [],
      children: [],
      questionPicture: {
        urlDE: '/tmp/q.png',
        urlEN: '/tmp/q.png',
        altTextDE: 'Alt DE',
        altTextEN: 'Alt EN',
      },
      solutionPicture: {
        urlDE: '/tmp/s.png',
        urlEN: '/tmp/s.png',
      },
      size: { unit: 'relative', dimension: 'width', scalar: 0.5 },
    };

    const options = {
      solution: false,
      lang: 'DE' as const,
      workingDir: '/tmp',
    };
    const taskPath = 'img/q.png';
    const solutionPath = 'img/s.png';

    const rendered = renderer.renderPictureTaskImpl(
      task,
      options,
      taskPath,
      solutionPath,
    );

    const expected = `
\\escapedStringTypeout{VSEXAM: {'Typ':'BildAufgabe', 'Bildtext': '', 'Loesungsbild': ''}}
\\begin{center}
\\includegraphics[width=0.5\\textwidth]%
{img/q.png}
\\end{center}

\\centerline{\\textit{%
\\ifthenelse{\\equal{\\sprache}{de}}%
{Alt DE}%
{Alt EN}%
}}
`;

    assertEquals(rendered, expected);
  },
);

Deno.test(
  'TaskRenderer.renderTableTask renders solution table task template',
  () => {
    const eta = getEta(TEMPLATE_PATH);
    const renderer = new TaskRenderer(eta);

    const task: TableTask = {
      _id: 'task-table-1',
      type: 'table',
      question: { DE: 'Q', EN: 'Q' },
      points: 5,
      tagIds: [],
      tags: [],
      createdBy: 'user',
      createdAt: new Date(),
      lastUsed: new Date(),
      usedIn: [],
      children: [],
      tableHeadersQuestion: [],
      tableHeadersSolution: [
        { DE: 'HD1', EN: 'HE1' },
        { DE: 'HD2', EN: 'HE2' },
      ],
      tableDataQuestion: [
        [
          { DE: 'QD11', EN: 'QE11' },
          { DE: 'QD12', EN: 'QE12' },
        ],
        [
          { DE: 'QD21', EN: 'QE21' },
          { DE: 'QD22', EN: 'QE22' },
        ],
      ],
      tableDataSolution: [
        [
          { DE: 'SD11', EN: 'SE11' },
          { DE: 'SD12', EN: 'SE12' },
        ],
        [
          { DE: 'SD21', EN: 'SE21' },
          { DE: 'SD22', EN: 'SE22' },
        ],
      ],
    };

    const renderedSolution = renderer.renderTableTask(task, {
      solution: true,
    });

    const expectedSolution = `\\begin{center}
\\begin{tabular}{|l|l|}

\\hline
\\ifthenelse{\\equal{\\sprache}{de}}{%
\\textbf{HD1}
}{%
\\textbf{HE1}
}
&
\\ifthenelse{\\equal{\\sprache}{de}}{%
\\textbf{HD2}
}{%
\\textbf{HE2}
}
\\\\
\\hline
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\ifthenelse{\\equal{\\sprache}{de}}{%
SD11%
}{%
SE11%
}
&
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\ifthenelse{\\equal{\\sprache}{de}}{%
SD12%
}{%
SE12%
}
\\\\
\\hline
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\ifthenelse{\\equal{\\sprache}{de}}{%
SD21%
}{%
SE21%
}
&
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\ifthenelse{\\equal{\\sprache}{de}}{%
SD22%
}{%
SE22%
}
\\\\
\\hline

\\end{tabular}
\\end{center}
`;

    assertEquals(renderedSolution, expectedSolution);
  },
);

Deno.test(
  'TaskRenderer.renderTableTask renders question table task template',
  () => {
    const eta = getEta(TEMPLATE_PATH);
    const renderer = new TaskRenderer(eta);

    const task: TableTask = {
      _id: 'task-table-1',
      type: 'table',
      question: { DE: 'Q', EN: 'Q' },
      points: 5,
      tagIds: [],
      tags: [],
      createdBy: 'user',
      createdAt: new Date(),
      lastUsed: new Date(),
      usedIn: [],
      children: [],
      tableHeadersQuestion: [],
      tableHeadersSolution: [
        { DE: 'HD1', EN: 'HE1' },
        { DE: 'HD2', EN: 'HE2' },
      ],
      tableDataQuestion: [
        [
          { DE: 'QD11', EN: 'QE11' },
          { DE: '', EN: '' },
        ],
        [
          { DE: 'QD21', EN: 'QE21' },
          { DE: '', EN: '' },
        ],
      ],
      tableDataSolution: [
        [
          { DE: 'SD11', EN: 'SE11' },
          { DE: 'SD12', EN: 'SE12' },
        ],
        [
          { DE: 'SD21', EN: 'SE21' },
          { DE: 'SD22', EN: 'SE22' },
        ],
      ],
    };
    const renderedQuestion = renderer.renderTableTask(task, {
      solution: false,
    });

    const expectedQuestion = `\\begin{center}
\\begin{tabular}{|l|l|}

\\hline
\\ifthenelse{\\equal{\\sprache}{de}}{%
\\textbf{HD1}
}{%
\\textbf{HE1}
}
&
\\ifthenelse{\\equal{\\sprache}{de}}{%
\\textbf{HD2}
}{%
\\textbf{HE2}
}
\\\\
\\hline
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\ifthenelse{\\equal{\\sprache}{de}}{%
QD11%
}{%
QE11%
}
&
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\hspace{4em}
\\\\
\\hline
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\ifthenelse{\\equal{\\sprache}{de}}{%
QD21%
}{%
QE21%
}
&
\\escapedStringTypeout{VSEXAM: {'Typ':'FreitextLine', 'Aufgabentext': '', 'Loesung': ''}}%
\\hspace{4em}
\\\\
\\hline

\\end{tabular}
\\end{center}
`;

    assertEquals(renderedQuestion, expectedQuestion);
  },
);

const propertyTask: PropertyTask = {
  _id: 'task-prop-1',
  type: 'property',
  question: {
    DE: 'Welche Eigenschaften treffen zu?',
    EN: 'Which properties apply?',
  },
  points: 6,
  tagIds: [],
  tags: [],
  createdBy: 'user',
  createdAt: new Date(),
  lastUsed: new Date(),
  usedIn: [],
  children: [],
  header: [
    { DE: 'Opt A', EN: 'Opt A' },
    { DE: 'Opt B', EN: 'Opt B' },
    { DE: 'Aussage', EN: 'Statement' },
  ],
  lines: [
    { options: [true, false], text: { DE: 'Aussage 1', EN: 'Statement 1' } },
    { options: [false, true], text: { DE: 'Aussage 2', EN: 'Statement 2' } },
    { options: [true, true], text: { DE: 'Aussage 3', EN: 'Statement 3' } },
  ],
};

Deno.test(
  'TaskRenderer.renderPropertyTask renders property task template for student version',
  () => {
    const eta = getEta(TEMPLATE_PATH);
    const renderer = new TaskRenderer(eta);

    const expected = `
\\begin{tabularx}{\\textwidth}{ccX}
\\blacktoprule

\\multicolumn{3}{p{\\textwidth}}{
\\ifthenelse{\\equal{\\sprache}{de}}
{Für jede richtige Zeile gibt es 2 Punkt(e). Für falsche Zeilen gibt es keine Negativpunkte.}
{You get 2 point(s) for each correct row. You don't get negative points for wrong rows.}
} \\\\

\\ifthenelse{\\equal{\\sprache}{de}}{Opt A}{Opt A} &
\\ifthenelse{\\equal{\\sprache}{de}}{Opt B}{Opt B} &
\\ifthenelse{\\equal{\\sprache}{de}}{Aussage}{Statement} \\\\

\\addlinespace
\\escapedStringTypeout{VSEXAM: {'Typ':'PropLine', 'Antwort1': 'w', 'Antwort2': 'f'}}
\\emptyb & \\emptyb & \\ifthenelse{\\equal{\\sprache}{de}}{Aussage 1}{Statement 1} \\\\

\\addlinespace
\\escapedStringTypeout{VSEXAM: {'Typ':'PropLine', 'Antwort1': 'f', 'Antwort2': 'w'}}
\\emptyb & \\emptyb & \\ifthenelse{\\equal{\\sprache}{de}}{Aussage 2}{Statement 2} \\\\

\\addlinespace
\\escapedStringTypeout{VSEXAM: {'Typ':'PropLine', 'Antwort1': 'w', 'Antwort2': 'w'}}
\\emptyb & \\emptyb & \\ifthenelse{\\equal{\\sprache}{de}}{Aussage 3}{Statement 3} \\\\

\\blackbottomrule
\\end{tabularx}
`;

    const rendered = renderer.renderPropertyTask(propertyTask, {
      solution: false,
      lang: 'DE',
    });

    assertEquals(rendered, expected);
  },
);

Deno.test(
  'TaskRenderer.renderPropertyTask renders property task template for solution',
  () => {
    const eta = getEta(TEMPLATE_PATH);
    const renderer = new TaskRenderer(eta);

    const expected = `
\\begin{tabularx}{\\textwidth}{ccX}
\\blacktoprule

\\multicolumn{3}{p{\\textwidth}}{
\\ifthenelse{\\equal{\\sprache}{de}}
{Für jede richtige Zeile gibt es 2 Punkt(e). Für falsche Zeilen gibt es keine Negativpunkte.}
{You get 2 point(s) for each correct row. You don't get negative points for wrong rows.}
} \\\\

\\ifthenelse{\\equal{\\sprache}{de}}{Opt A}{Opt A} &
\\ifthenelse{\\equal{\\sprache}{de}}{Opt B}{Opt B} &
\\ifthenelse{\\equal{\\sprache}{de}}{Aussage}{Statement} \\\\

\\addlinespace
\\escapedStringTypeout{VSEXAM: {'Typ':'PropLine', 'Antwort1': 'w', 'Antwort2': 'f'}}
{\\color{red} $\\tickedbox$} & {\\color{red} \\emptyb} & \\ifthenelse{\\equal{\\sprache}{de}}{Aussage 1}{Statement 1} \\\\

\\addlinespace
\\escapedStringTypeout{VSEXAM: {'Typ':'PropLine', 'Antwort1': 'f', 'Antwort2': 'w'}}
{\\color{red} \\emptyb} & {\\color{red} $\\tickedbox$} & \\ifthenelse{\\equal{\\sprache}{de}}{Aussage 2}{Statement 2} \\\\

\\addlinespace
\\escapedStringTypeout{VSEXAM: {'Typ':'PropLine', 'Antwort1': 'w', 'Antwort2': 'w'}}
{\\color{red} $\\tickedbox$} & {\\color{red} $\\tickedbox$} & \\ifthenelse{\\equal{\\sprache}{de}}{Aussage 3}{Statement 3} \\\\

\\blackbottomrule
\\end{tabularx}
`;

    const rendered = renderer.renderPropertyTask(propertyTask, {
      solution: true,
      lang: 'DE',
    });

    assertEquals(rendered, expected);
  },
);
