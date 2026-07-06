import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamsPoolComponent } from './exams-pool.component';

describe('ExamsPoolComponent', () => {
  let component: ExamsPoolComponent;
  let fixture: ComponentFixture<ExamsPoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamsPoolComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExamsPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
