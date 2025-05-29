import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskPoolComponent } from './task-pool.component';

describe('TaskPoolComponent', () => {
  let component: TaskPoolComponent;
  let fixture: ComponentFixture<TaskPoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskPoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
