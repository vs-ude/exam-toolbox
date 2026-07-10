import { Injectable } from '@angular/core';
import { Task } from '../types/shared/tasks';
import { ApiService } from './api.service';
import { User } from '../types/user';

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

  public createTask(taskType: string): Task {
    switch (taskType) {
      case 'new_multipleChoice':
        return {
          taskId: 'multipleChoice-' + Date.now(),
          type: 'multipleChoice',
          question: { DE: '', EN: '' },
          answerOptions: [{ DE: '', EN: '', correct: true }],
          points: 1,
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: ['placeholder_id'],
          tags: [],
          tagIds: [],
          children: [],
        };
      case 'new_shortAnswer':
        return {
          taskId: 'shortAnswer-' + Date.now(),
          type: 'shortAnswer',
          question: { DE: '', EN: '' },
          solution: { DE: '', EN: '' },
          points: 1,
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: ['placeholder_id'],
          tags: [],
          tagIds: [],
          children: [],
        };
      case 'new_picture':
        return {
          taskId: 'picture-' + Date.now(),
          type: 'pictureTask',
          question: { DE: '', EN: '' },
          questionPicture: { urlDE: '', urlEN: '' },
          solutionPicture: { urlDE: '', urlEN: '' },
          points: 1,
          createdBy: this.user.id,
          createdAt: new Date(),
          lastUsed: new Date(),
          usedIn: ['placeholder_id'],
          tagIds: [],
          tags: [],
          children: [],
        };
      case 'new_latex':
        return {
          taskId: 'latex-' + Date.now(),
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
          taskId: 'table-' + Date.now(),
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
          taskId: 'manualText-' + Date.now(),
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
          taskId: 'newPage-' + Date.now(),
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
