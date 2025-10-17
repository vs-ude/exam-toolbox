import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewPageDialogComponent } from './new-page-dialog.component';

describe('NewPageDialogComponent', () => {
  let component: NewPageDialogComponent;
  let fixture: ComponentFixture<NewPageDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPageDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewPageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
