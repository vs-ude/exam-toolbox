import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DraggablePoolComponent } from './draggable-pool.component';

describe('DraggablePoolComponent', () => {
  let component: DraggablePoolComponent;
  let fixture: ComponentFixture<DraggablePoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DraggablePoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DraggablePoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
