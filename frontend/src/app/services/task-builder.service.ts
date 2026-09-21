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
      groupTitle: { A: '', B: '' },
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
          question: { A: '', B: '' },
          answerOptions: [{ A: '', B: '', correct: true }],
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
          question: { A: '', B: '' },
          solution: { A: '', B: '' },
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
          question: { A: '', B: '' },
          questionPicture: { url: { A: '', B: '' } },
          solutionPicture: { url: { A: '', B: '' } },
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
            A: '',
            B: '',
          },
          questionLatex: { A: '\\(\n\n\\)', B: '' },
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
          question: { A: '', B: '' },
          tableHeadersQuestion: [
            { A: '', B: '' },
            { A: '', B: '' },
          ],
          tableDataQuestion: [
            [
              { A: '', B: '' },
              { A: '', B: '' },
            ],
            [
              { A: '', B: '' },
              { A: '', B: '' },
            ],
          ],
          tableHeadersSolution: [
            { A: '', B: '' },
            { A: '', B: '' },
          ],
          tableDataSolution: [
            [
              { A: '', B: '' },
              { A: '', B: '' },
            ],
            [
              { A: '', B: '' },
              { A: '', B: '' },
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
          question: { A: '', B: '' },
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
          question: { A: '', B: '' },
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
