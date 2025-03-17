import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskGroupTitleComponent } from './task-group-title.component';

describe('TaskGroupTitleComponent', () => {
  let component: TaskGroupTitleComponent;
  let fixture: ComponentFixture<TaskGroupTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskGroupTitleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskGroupTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
