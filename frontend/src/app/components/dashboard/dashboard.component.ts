import {
  Component,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { COMMON_IMPORTS } from '../common-imports';

import { ApiService } from '../../services/api.service';
import { ExamStub } from '../../types/shared/stubs';

import { ExamCardComponent } from '../exam-card/exam-card.component';
import { ExamsTableComponent } from '../exams-table/exams-table.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    ...COMMON_IMPORTS,
    MatButtonModule,
    ExamCardComponent,
    ExamsTableComponent,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  recentExams: ExamStub[] = [];

  constructor(
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.api.getRecentExams().subscribe(exams => {
      this.recentExams = exams;
    });
    this.viewOption =
      localStorage.getItem('viewMode') === 'list' ? 'list' : 'grid';
  }

  @HostListener('document:click', ['$event'])
  handleDropdownStates(event: MouseEvent) {
    const elementId = (event.target as Element).id;

    if (elementId === 'openSortingDropdown') {
      this.showDropdowns.sorting = !this.showDropdowns.sorting;
    } else {
      this.showDropdowns.sorting = false;
    }

    if (elementId === 'openFilterDropdown') {
      this.showDropdowns.filter = !this.showDropdowns.filter;
    } else {
      this.showDropdowns.filter = false;
    }
  }

  public showDropdowns = { sorting: false, filter: false };
  public viewOption: 'grid' | 'list' = 'grid';

  public toggleViewOption(mode: 'grid' | 'list') {
    this.viewOption = mode;
    localStorage.setItem('viewMode', mode);
  }

  public onAddExam() {
    this.router.navigate(['/create-exam']);
  }

  public onTaskPool() {
    this.router.navigate(['/task-pool']);
  }

  public onDebug() {
    this.router.navigate(['/debug']);
  }

  public onExamsPool() {
    this.router.navigate(['/exams-pool']);
  }

  public onExamClick(examId: string | undefined) {
    if (!examId) {
      console.warn('Selected exam has no ID');
      return;
    }
    this.router.navigate([`/edit-exam/${examId}`]);
  }
}
