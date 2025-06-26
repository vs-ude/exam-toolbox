import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableTaskComponent } from './table-task.component';

describe('TableTaskComponent', () => {
  let component: TableTaskComponent;
  let fixture: ComponentFixture<TableTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableTaskComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
