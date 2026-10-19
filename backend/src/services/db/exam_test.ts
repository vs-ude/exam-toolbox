// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from '@std/assert';

import { HttpError } from '../../types/handler.ts';
import { Exam, Task } from '../../types/mod.ts';

import { ExamToolboxDatabase } from './db.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(): Task {
  return {
    type: 'multipleChoice',
    question: { A: 'q', B: 'q' },
    points: 5,
    answerOptions: [],
    tagIds: [],
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'test',
    lastUsed: new Date('2026-01-01T00:00:00Z'),
    usedIn: [],
    parent: undefined,
    children: [],
  };
}

function makeExamDoc(overrides: Record<string, any> = {}): any {
  const exam: Exam = new Exam(
    'Analysis',
    'Dr. Doe',
    'WS 25/26',
    '2026-01-15',
    120,
    [
      {
        groupNumber: 1,
        groupTitle: { A: 'Group 1', B: 'Group 1' },
        tasks: [makeTask(), makeTask(), makeTask()],
      },
      {
        groupNumber: 2,
        groupTitle: { A: 'Group 2', B: 'Group 2' },
        tasks: [makeTask()],
      },
    ],
    { users: ['user1'], groups: ['teachers'] },
    'exam:1',
  );

  exam.lastEditedBy = 'user1';
  exam.updatedAt = new Date('2026-01-01T00:00:00Z');

  for (const [key, value] of Object.entries(overrides)) {
    (exam as any)[key] = value;
  }
  // Compute taskCount (excluding manualText and newPage tasks)
  exam.fillMeta();
  return exam;
}

/**
 * Minimal in-memory stand-in for the `exams` collection, implementing only
 * the operations the admin functions under test rely on.
 */
function makeDb(docs: any[]): ExamToolboxDatabase {
  const exams = {
    find: () => ({
      toArray: () => [...docs],
    }),
    findOne: (/* deno-lint-ignore no-explicit-any */ _filter: any) =>
      docs.find(d => d._id === _filter._id),
    deleteOne: (/* deno-lint-ignore no-explicit-any */ _filter: any) => {
      const idx = docs.findIndex(d => d._id === _filter._id);
      if (idx !== -1) docs.splice(idx, 1);
      return { deletedCount: idx === -1 ? 0 : 1 };
    },
    updateOne: (
      /* deno-lint-ignore no-explicit-any */ _filter: any,
      /* deno-lint-ignore no-explicit-any */ _update: any,
    ) => {
      const doc = docs.find(d => d._id === _filter._id);
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      Object.assign(doc, _update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    insertOne: (/* deno-lint-ignore no-explicit-any */ doc: any) => {
      const existing = docs.find(d => d._id === doc._id);
      if (existing) {
        Object.assign(existing, doc);
        return { matchedCount: 1, modifiedCount: 1 };
      }
      docs.push(doc);
      return { insertedId: doc._id };
    },
    aggregate: (/* deno-lint-ignore no-explicit-any */ pipeline: any[]) => {
      // Simple mock aggregation supporting $sort and $project
      let result = [...docs];
      for (const stage of pipeline) {
        if (stage.$sort) {
          const [field, direction] = Object.entries(stage.$sort)[0];
          result.sort((a, b) => {
            const aVal = a[field] ?? '';
            const bVal = b[field] ?? '';
            const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            return direction === 1 ? cmp : -cmp;
          });
        } else if (stage.$project) {
          const projections = stage.$project;
          result = result.map(doc => {
            const projected: any = {};
            for (const [key, value] of Object.entries(projections)) {
              if (value === 1) {
                projected[key] = doc[key];
              }
            }
            return projected;
          });
        }
      }
      return { toArray: () => result };
    },
  };

  // Stub tasks collection for upsertTasks
  const tasks = {
    find: () => ({ toArray: () => [] }),
    findOne: (/* deno-lint-ignore no-explicit-any */ _filter: any) => undefined,
    insertOne: (/* deno-lint-ignore no-explicit-any */ doc: any) => {
      // Stub implementation: just return success
      return { insertedId: doc._id };
    },
    updateOne: (
      /* deno-lint-ignore no-explicit-any */ _filter: any,
      /* deno-lint-ignore no-explicit-any */ _update: any,
    ) => {
      return { matchedCount: 1, modifiedCount: 1 };
    },
    updateMany: (
      /* deno-lint-ignore no-explicit-any */ _filter: any,
      /* deno-lint-ignore no-explicit-any */ _update: any,
    ) => {
      return { matchedCount: 0, modifiedCount: 0 };
    },
    deleteOne: (/* deno-lint-ignore no-explicit-any */ _filter: any) => {
      return { deletedCount: 0 };
    },
    deleteMany: (/* deno-lint-ignore no-explicit-any */ _filter: any) => {
      return { deletedCount: 0 };
    },
  };

  return new ExamToolboxDatabase(null as any, { exams, tasks } as any);
}

// ---------------------------------------------------------------------------
// getAllExamsAdmin
// ---------------------------------------------------------------------------

Deno.test('getAllExamsAdmin returns all exams as stubs with taskCount', () => {
  const docs = [makeExamDoc(), makeExamDoc({ _id: 'exam:2', tasks: [] })];
  const db = makeDb(docs);
  return db.getAllExamsAdmin().then(stubs => {
    assertEquals(stubs.length, 2);
    assertEquals(stubs[0].taskCount, 4);
    assertEquals(stubs[1].taskCount, 0);
    // Tasks must not be part of the stub
    assertEquals('tasks' in stubs[0], false);
    assertEquals(stubs[0].courseName, 'Analysis');
    assertEquals(stubs[0].access, { users: ['user1'], groups: ['teachers'] });
  });
});

Deno.test('getAllExamsAdmin sorts by taskCount in both directions', () => {
  const docs = [
    makeExamDoc({ _id: 'exam:a', tasks: [] }),
    makeExamDoc({ _id: 'exam:b' }),
    makeExamDoc({
      _id: 'exam:c',
      tasks: [
        {
          groupNumber: 1,
          groupTitle: { A: 'g', B: 'g' },
          tasks: [makeTask()],
        },
      ],
    }),
  ];
  const db = makeDb(docs);
  return db
    .getAllExamsAdmin('taskCount')
    .then(stubs => {
      const ids = stubs.map(s => s._id);
      assertEquals(ids, ['exam:a', 'exam:c', 'exam:b']);
      return db.getAllExamsAdmin('taskCount', 'desc');
    })
    .then(stubs => {
      const ids = stubs.map(s => s._id);
      assertEquals(ids, ['exam:b', 'exam:c', 'exam:a']);
    });
});

Deno.test('getAllExamsAdmin sorts by date (string compare)', () => {
  const docs = [
    makeExamDoc({ _id: 'exam:a', date: '2026-03-01' }),
    makeExamDoc({ _id: 'exam:b', date: '2026-01-01' }),
    makeExamDoc({ _id: 'exam:c', date: '2026-02-01' }),
  ];
  const db = makeDb(docs);
  return db.getAllExamsAdmin('date', 'desc').then(stubs => {
    assertEquals(
      stubs.map(s => s._id),
      ['exam:a', 'exam:c', 'exam:b'],
    );
  });
});

Deno.test('getAllExamsAdmin sorts by owner, missing lastEditedBy first', () => {
  const docs = [
    makeExamDoc({ _id: 'exam:a', lastEditedBy: 'zoe' }),
    makeExamDoc({ _id: 'exam:b', lastEditedBy: 'alice' }),
    makeExamDoc({ _id: 'exam:c', lastEditedBy: undefined }),
  ];
  const db = makeDb(docs);
  return db.getAllExamsAdmin('owner').then(stubs => {
    // Missing lastEditedBy sorts as '' -> first in ascending order
    assertEquals(
      stubs.map(s => s._id),
      ['exam:c', 'exam:b', 'exam:a'],
    );
  });
});

// ---------------------------------------------------------------------------
// deleteExamAdmin
// ---------------------------------------------------------------------------

Deno.test('deleteExamAdmin deletes the exam and returns deletedCount 1', () => {
  const docs = [makeExamDoc(), makeExamDoc({ _id: 'exam:2' })];
  const db = makeDb(docs);
  return db.deleteExamAdmin('exam:1').then(result => {
    assertEquals(result, 1);
    assertEquals(docs.length, 1);
    assertEquals(docs[0]._id, 'exam:2');
  });
});

Deno.test('deleteExamAdmin returns deletedCount 0 for unknown id', () => {
  const db = makeDb([makeExamDoc()]);
  return db.deleteExamAdmin('exam:missing').then(result => {
    assertEquals(result, 0);
  });
});

// ---------------------------------------------------------------------------
// setExamAccess
// ---------------------------------------------------------------------------

Deno.test('setExamAccess replaces the access field of the exam', () => {
  const docs = [makeExamDoc()];
  const db = makeDb(docs);
  const access = {
    users: ['admin1', 'admin2'],
    groups: ['teachers', 'admins'],
  };
  return db.setExamAccess('exam:1', access).then(() => {
    assertEquals(docs[0].access, access);
    // Other fields must remain untouched
    assertEquals(docs[0].courseName, 'Analysis');
    assertEquals(docs[0].date, '2026-01-15');
  });
});

Deno.test(
  'setExamAccess rejects with HttpError 404 for unknown id',
  async () => {
    const db = makeDb([makeExamDoc()]);
    await assertRejects(async () => {
      await db.setExamAccess('exam:missing', { users: ['u'] });
    }, HttpError);
  },
);

// ---------------------------------------------------------------------------
// createExam
// ---------------------------------------------------------------------------

Deno.test(
  'createExam generates a new ID and inserts the exam document',
  async () => {
    const docs: any[] = [];
    const db = makeDb(docs);

    const user = {
      sub: 'user1',
      name: 'User 1',
      email: 'user1@test.com',
      groups: [],
    };
    const exam: Exam = makeExamDoc({
      courseName: 'Calculus',
      examinerName: 'Dr. Smith',
      semester: 'SS 26/27',
      date: '2026-06-15',
      examLengthMinutes: 90,
      tasks: [
        {
          groupNumber: 1,
          groupTitle: { A: 'Group 1', B: 'Group 1' },
          tasks: [makeTask(), makeTask()],
        },
      ],
      access: { users: [], groups: [] },
    });

    const id = await db.createExam(exam, user);

    assertEquals(id.startsWith('exam:'), true);
    assertEquals(docs.length, 1);
    assertEquals(docs[0]._id, id);
    assertEquals(docs[0].courseName, 'Calculus');
    assertEquals(docs[0].examinerName, 'Dr. Smith');
  },
);

Deno.test(
  'createExam sets lastEditedBy and updatedAt to the creating user',
  async () => {
    const docs: any[] = [];
    const db = makeDb(docs);

    const user = {
      sub: 'creator',
      name: 'Creator',
      email: 'creator@test.com',
      groups: [],
    };
    const exam: Exam = makeExamDoc({
      courseName: 'Physics',
      tasks: [],
      access: { users: [], groups: [] },
    });

    await db.createExam(exam, user);

    assertEquals(docs[0].lastEditedBy, 'creator');
    assertEquals(docs[0].updatedAt instanceof Date, true);
  },
);

Deno.test(
  'createExam adds the user to the access.users list if not present',
  async () => {
    const docs: any[] = [];
    const db = makeDb(docs);

    const user = {
      sub: 'john',
      name: 'John',
      email: 'john@test.com',
      groups: [],
    };
    const exam: Exam = makeExamDoc({
      courseName: 'Math',
      tasks: [],
      access: { users: ['alice'], groups: [] },
    });

    await db.createExam(exam, user);

    assertEquals(docs[0].access.users, ['alice', 'john']);
  },
);

Deno.test(
  'createExam does not duplicate the user in access.users if already present',
  async () => {
    const docs: any[] = [];
    const db = makeDb(docs);

    const user = {
      sub: 'alice',
      name: 'Alice',
      email: 'alice@test.com',
      groups: [],
    };
    const exam: Exam = makeExamDoc({
      courseName: 'Chem',
      tasks: [],
      access: { users: ['alice'], groups: [] },
    });

    await db.createExam(exam, user);

    assertEquals(docs[0].access.users, ['alice']);
  },
);

Deno.test('createExam calls upsertTasks to register tasks', async () => {
  let upsertTasksCalled = false;
  const upsertTasks = (
    /* deno-lint-ignore no-explicit-any */ _tasks: any[],
    /* deno-lint-ignore no-explicit-any */ _id: string,
    /* deno-lint-ignore no-explicit-any */ _user: any,
  ) => {
    upsertTasksCalled = true;
  };
  const db = makeDb([]) as any;
  (db as any).upsertTasks = upsertTasks;

  const user = {
    sub: 'user1',
    name: 'User 1',
    email: 'user1@test.com',
    groups: ['teachers'],
  };
  const exam: Exam = makeExamDoc({
    courseName: 'Biology',
    tasks: [
      {
        groupNumber: 1,
        groupTitle: { A: 'g', B: 'g' },
        tasks: [makeTask(), makeTask(), makeTask()],
      },
    ],
    access: { users: [], groups: [] },
  });

  await db.createExam(exam, user);

  assertEquals(upsertTasksCalled, true);
});

// ---------------------------------------------------------------------------
// updateExam
// ---------------------------------------------------------------------------

Deno.test('updateExam updates an existing exam document', async () => {
  const docs: any[] = [makeExamDoc()];
  const upsertTasks = async (
    /* deno-lint-ignore no-explicit-any */ _tasks: any[],
    /* deno-lint-ignore no-explicit-any */ _id: string,
    /* deno-lint-ignore no-explicit-any */ _user: any,
  ) => {};
  const db = makeDb(docs) as any;
  (db as any).upsertTasks = upsertTasks;

  const user = {
    sub: 'editor',
    name: 'Editor',
    email: 'editor@test.com',
    groups: ['teachers'],
  };
  const data: Exam = makeExamDoc({
    courseName: 'Advanced Analysis',
    examinerName: 'Prof. Jones',
    tasks: [],
    access: { users: [], groups: ['teachers'] },
  });

  const id = await db.updateExam('exam:1', data, user);

  assertEquals(id, 'exam:1');
  assertEquals(docs[0].courseName, 'Advanced Analysis');
  assertEquals(docs[0].examinerName, 'Prof. Jones');
  assertEquals(docs[0].lastEditedBy, 'editor');
  assertEquals(docs[0].updatedAt instanceof Date, true);
});

Deno.test(
  'updateExam does not duplicate the user in access.users if already present',
  async () => {
    const docs: Exam[] = [makeExamDoc()];
    const upsertTasks = async (
      /* deno-lint-ignore no-explicit-any */ _tasks: any[],
      /* deno-lint-ignore no-explicit-any */ _id: string,
      /* deno-lint-ignore no-explicit-any */ _user: any,
    ) => {};
    const db = makeDb(docs) as any;
    (db as any).upsertTasks = upsertTasks;

    const user = {
      sub: 'alice',
      name: 'Alice',
      email: 'alice@test.com',
      groups: ['teachers'],
    };
    const data: Exam = makeExamDoc({
      courseName: 'Stats',
      tasks: [],
      access: { users: ['alice'], groups: ['teachers'] },
    });

    await db.updateExam('exam:1', data, user);

    assertEquals(docs[0].access.users, ['alice']);
  },
);

Deno.test('updateExam throws if the exam is not found', async () => {
  const docs: any[] = []; // Empty docs array
  const upsertTasks = async (
    /* deno-lint-ignore no-explicit-any */ _tasks: any[],
    /* deno-lint-ignore no-explicit-any */ _id: string,
    /* deno-lint-ignore no-explicit-any */ _user: any,
  ) => {};
  const db = makeDb(docs) as any;
  (db as any).upsertTasks = upsertTasks;

  const user = {
    sub: 'editor',
    name: 'Editor',
    email: 'editor@test.com',
    groups: [],
  };
  const data: Exam = makeExamDoc({
    courseName: 'Missing',
    tasks: [],
    access: { users: [], groups: [] },
  });

  await assertRejects(
    async () => {
      await db.updateExam('exam:missing', data, user);
    },
    Error,
    'not found',
  );
});

Deno.test(
  'updateExam updates the lastEditedBy and updatedAt fields',
  async () => {
    const docs: any[] = [
      makeExamDoc({
        _id: 'exam:1',
        lastEditedBy: 'old',
        updatedAt: new Date('2026-01-01'),
      }),
    ];
    const upsertTasks = async (
      /* deno-lint-ignore no-explicit-any */ _tasks: any[],
      /* deno-lint-ignore no-explicit-any */ _id: string,
      /* deno-lint-ignore no-explicit-any */ _user: any,
    ) => {};
    const db = makeDb(docs) as any;
    (db as any).upsertTasks = upsertTasks;

    const user = {
      sub: 'newEditor',
      name: 'NewEditor',
      email: 'neweditor@test.com',
      groups: ['teachers'],
    };
    const data: Exam = makeExamDoc({
      courseName: 'Updated',
      tasks: [],
      access: { users: [], groups: ['teachers'] },
    });

    await db.updateExam('exam:1', data, user);

    assertEquals(docs[0].lastEditedBy, 'newEditor');
    assertEquals(docs[0].updatedAt instanceof Date, true);
  },
);
