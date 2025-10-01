import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DownloadableExamsComponent } from './downloadable-exams.component';

describe('DownloadableExamsComponent', () => {
  let component: DownloadableExamsComponent;
  let fixture: ComponentFixture<DownloadableExamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DownloadableExamsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DownloadableExamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
