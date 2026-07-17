import { assertEquals } from '@std/assert';
import { Exam } from './exam.ts';
import { type NewPage, type ShortAnswerTask, type TaskGroup } from './tasks.ts';

function makeShortAnswerTask(_taskId: string, points: number): ShortAnswerTask {
  return {
    type: 'shortAnswer',
    question: { DE: 'Frage', EN: 'Question' },
    points,
    tagIds: [],
    tags: [],
    createdBy: 'tester',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
    solution: { DE: 'Lösung', EN: 'Solution' },
  };
}

function makeNewPageTask(_taskId: string): NewPage {
  return {
    type: 'newPage',
    question: { DE: '', EN: '' },
    points: 0,
    tagIds: [],
    tags: [],
    createdBy: 'tester',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  };
}

Deno.test('Exam constructor sets placeholders and defaults', () => {
  const exam = new Exam();

  assertEquals(exam.courseName, '');
  assertEquals(exam.examinerName, '');
  assertEquals(exam.semester, 'WS 70/71');
  assertEquals(exam.date, '1970-01-01');
  assertEquals(exam.examLengthMinutes, 0);
  assertEquals(exam.tasks, []);
  assertEquals(exam._id, undefined);
  assertEquals(exam.points, undefined);
  assertEquals(exam.pageCount, undefined);
  assertEquals(exam.conceptPages, undefined);
});

Deno.test(
  'Exam.fillPagesAndPoints computes defaults when there are no tasks',
  () => {
    const exam = new Exam();

    exam.fillPagesAndPoints();

    assertEquals(exam.points, 0);
    // 0 (task headings) + 0 (newPage tasks) + 2 default concept pages + 3 fixed pages = 5
    // then rounded up to even page count by adding one concept page.
    assertEquals(exam.pageCount, 6);
    assertEquals(exam.conceptPages, 3);
  },
);

Deno.test(
  'Exam.fillPagesAndPoints sums task points and keeps an even page count',
  () => {
    const tasks: TaskGroup[] = [
      {
        groupNumber: 1,
        groupTitle: { DE: 'Teil A', EN: 'Part A' },
        tasks: [makeShortAnswerTask('task-1', 5)],
      },
    ];

    const exam = new Exam('Course', 'Examiner', 'WS', '2026-01-01', 90, tasks);
    exam.conceptPages = 2;

    exam.fillPagesAndPoints();

    assertEquals(exam.points, 5);
    // 1 (task headings) + 0 (newPage task) + 2 concept pages + 3 fixed pages = 6
    // then rounded up to even page count by adding one concept page.
    assertEquals(exam.pageCount, 6);
    assertEquals(exam.conceptPages, 2);
  },
);

Deno.test(
  'Exam.fillPagesAndPoints sums task points and evens up the page count',
  () => {
    const tasks: TaskGroup[] = [
      {
        groupNumber: 1,
        groupTitle: { DE: 'Teil A', EN: 'Part A' },
        tasks: [
          makeShortAnswerTask('task-1', 5),
          makeNewPageTask('page-break'),
        ],
      },
      {
        groupNumber: 2,
        groupTitle: { DE: 'Teil B', EN: 'Part B' },
        tasks: [
          makeShortAnswerTask('task-2', 3),
          makeNewPageTask('page-break'),
        ],
      },
    ];

    const exam = new Exam('Course', 'Examiner', 'WS', '2026-01-01', 90, tasks);
    exam.conceptPages = 2;

    exam.fillPagesAndPoints();

    assertEquals(exam.points, 8);
    // 2 (task headings) + 2 (newPage task) + 2 concept pages + 3 fixed pages = 9
    // then rounded up to even page count by adding one concept page.
    assertEquals(exam.pageCount, 10);
    assertEquals(exam.conceptPages, 3);
  },
);

Deno.test(
  'Exam.fillPagesAndPoints works on an exam passed from JSON data',
  () => {
    const examJson = `{
      "_id": "69f9fbb4902f531ec6a95d7c",
      "courseName": "DEBUG EXAM",
      "examinerName": "Dr. Jane Smith",
      "semester": "SS 26",
      "date": "2025-12-15",
      "examLengthMinutes": 120,
      "tasks": [
          {
              "groupNumber": 1,
              "groupTitle": {
                  "DE": "",
                  "EN": ""
              },
              "tasks": [
                  {
                      "_id": "multipleChoice-1780310344264",
                      "type": "multipleChoice",
                      "question": {
                          "DE": "",
                          "EN": ""
                      },
                      "answerOptions": [
                          {
                              "DE": "",
                              "EN": "",
                              "correct": true
                          }
                      ],
                      "points": 1,
                      "createdBy": "test",
                      "createdAt": "2026-06-01T10:39:04.264Z",
                      "lastUsed": "2026-06-01T10:39:04.264Z",
                      "usedIn": [
                          "69f9fbb4902f531ec6a95d7c"
                      ],
                      "tags": [],
                      "tagIds": [],
                      "children": []
                  }
              ]
          }
      ],
      "lastEditedBy": "test",
      "updatedAt": "2026-06-10T12:14:03.798Z"
  }`;
    const exam: Exam = Object.assign(new Exam(), JSON.parse(examJson));

    exam.fillPagesAndPoints();

    assertEquals(exam.points, 1);
    // 1 (first page) + 2 concept pages + 3 fixed pages = 6
    // then rounded up to even page count by adding one concept page.
    assertEquals(exam.pageCount, 6);
    assertEquals(exam.conceptPages, 2);
  },
);
