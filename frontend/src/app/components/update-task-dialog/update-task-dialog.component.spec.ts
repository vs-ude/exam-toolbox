import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateTaskDialogComponent } from './update-task-dialog.component';

describe('UpdateTaskDialogComponent', () => {
  let component: UpdateTaskDialogComponent;
  let fixture: ComponentFixture<UpdateTaskDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateTaskDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateTaskDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
