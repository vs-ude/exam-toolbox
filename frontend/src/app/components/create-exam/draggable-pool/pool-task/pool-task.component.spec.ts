import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolTaskComponent } from './pool-task.component';

describe('PoolTaskComponent', () => {
  let component: PoolTaskComponent;
  let fixture: ComponentFixture<PoolTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolTaskComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PoolTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
