import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAuthDialogComponent } from './exam-auth-dialog.component';

describe('ExamAuthDialogComponent', () => {
  let component: ExamAuthDialogComponent;
  let fixture: ComponentFixture<ExamAuthDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamAuthDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExamAuthDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
