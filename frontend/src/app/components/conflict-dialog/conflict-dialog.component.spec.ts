import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConflictDialogComponent } from './conflict-dialog.component';

describe('ConflictDialogComponent', () => {
  let component: ConflictDialogComponent;
  let fixture: ComponentFixture<ConflictDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConflictDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConflictDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
