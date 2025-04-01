import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PictureTaskComponent } from './picture-task.component';

describe('PictureTaskComponent', () => {
  let component: PictureTaskComponent;
  let fixture: ComponentFixture<PictureTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PictureTaskComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PictureTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
