import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MassExamDialogComponent } from './mass-exam-dialog.component';

describe('MassExamDialogComponent', () => {
  let component: MassExamDialogComponent;
  let fixture: ComponentFixture<MassExamDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MassExamDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MassExamDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
