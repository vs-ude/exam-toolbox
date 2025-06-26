import { TestBed } from '@angular/core/testing';

import { TaskBuilderService } from './task-builder.service';

describe('TaskBuilderService', () => {
  let service: TaskBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
