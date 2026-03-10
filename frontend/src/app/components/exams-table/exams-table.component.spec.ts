import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamsTableComponent } from './exams-table.component';

describe('ExamsTableComponent', () => {
  let component: ExamsTableComponent;
  let fixture: ComponentFixture<ExamsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
