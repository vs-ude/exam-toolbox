import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LatexTaskComponent } from './latex-task.component';

describe('LatexTaskComponent', () => {
  let component: LatexTaskComponent;
  let fixture: ComponentFixture<LatexTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LatexTaskComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LatexTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
