import { Injectable } from '@angular/core';

import { Task, TaskGroup } from '../types/shared/tasks';
import { User } from '../types/user';

import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class TaskBuilderService {
  private user: User = new User();

  constructor(apiService: ApiService) {
    apiService.getUser().subscribe(
      user => {
        this.user = user;
      },
      error => {
        console.error('Error fetching user data:', error);
      },
    );
  }

  public createDefaultGroup(): TaskGroup {
    return {
      groupNumber: 1,
      groupTitle: { DE: '', EN: '' },
      tasks: [],
      points: 0,
    };
  }

  public createTask(taskType: string): Task {
    switch (taskType) {
      case 'new_multipleChoice':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'multipleChoice',
          question: { DE: '', EN: '' },
          answerOptions: [{ DE: '', EN: '', correct: true }],
          points: 1,
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          tags: [],
          tagIds: [],
          children: [],
        };
      case 'new_shortAnswer':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'shortAnswer',
          question: { DE: '', EN: '' },
          solution: { DE: '', EN: '' },
          points: 1,
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          tags: [],
          tagIds: [],
          children: [],
        };
      case 'new_pictureTask':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'pictureTask',
          question: { DE: '', EN: '' },
          questionPicture: { urlDE: '', urlEN: '' },
          solutionPicture: { urlDE: '', urlEN: '' },
          points: 1,
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          tagIds: [],
          tags: [],
          children: [],
        };
      case 'new_latex':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'latex',
          question: {
            DE: '',
            EN: '',
          },
          questionLatex: { DE: '\\(\n\n\\)', EN: '' },
          points: 0,
          tags: [],
          tagIds: [],
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          children: [],
        };
      case 'new_table':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'table',
          question: { DE: '', EN: '' },
          tableHeadersQuestion: [
            { DE: '', EN: '' },
            { DE: '', EN: '' },
          ],
          tableDataQuestion: [
            [
              { DE: '', EN: '' },
              { DE: '', EN: '' },
            ],
            [
              { DE: '', EN: '' },
              { DE: '', EN: '' },
            ],
          ],
          tableHeadersSolution: [
            { DE: '', EN: '' },
            { DE: '', EN: '' },
          ],
          tableDataSolution: [
            [
              { DE: '', EN: '' },
              { DE: '', EN: '' },
            ],
            [
              { DE: '', EN: '' },
              { DE: '', EN: '' },
            ],
          ],
          points: 0,
          tags: [],
          tagIds: [],
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          children: [],
        };
      case 'new_manualText':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'manualText',
          question: { DE: '', EN: '' },
          points: 0,
          tagIds: [],
          tags: [],
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          children: [],
        };
      case 'new_newPage':
        return {
          _id: 'tmp_' + crypto.randomUUID(),
          type: 'newPage',
          question: { DE: '', EN: '' },
          points: 0,
          tagIds: [],
          tags: [],
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: [],
          children: [],
        };
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
}
