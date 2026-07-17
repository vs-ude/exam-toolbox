import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualTextComponent } from './manual-text.component';

describe('ManualTextComponent', () => {
  let component: ManualTextComponent;
  let fixture: ComponentFixture<ManualTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManualTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
