import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskPoolCardComponent } from './task-pool-card.component';

describe('TaskPoolCardComponent', () => {
  let component: TaskPoolCardComponent;
  let fixture: ComponentFixture<TaskPoolCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskPoolCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskPoolCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
