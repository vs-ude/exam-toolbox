import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamSetupDialogComponent } from './exam-setup-dialog.component';

describe('ExamSetupDialogComponent', () => {
  let component: ExamSetupDialogComponent;
  let fixture: ComponentFixture<ExamSetupDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamSetupDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExamSetupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
