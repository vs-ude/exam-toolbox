import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortAnswerTaskComponent } from './short-answer-task.component';

describe('ShortAnswerTaskComponent', () => {
  let component: ShortAnswerTaskComponent;
  let fixture: ComponentFixture<ShortAnswerTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortAnswerTaskComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShortAnswerTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
