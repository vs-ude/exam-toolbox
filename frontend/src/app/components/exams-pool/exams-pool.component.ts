import { Component, HostListener, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { ExamCardComponent } from "../exam-card/exam-card.component";
import { Exam } from "../../exam";
import { ApiService, DownloadableJob } from "../../services/api.service";
import { saveAs } from "file-saver";
import { LoadingService } from "../../services/loading.service";
import { MatIconModule } from "@angular/material/icon";
import { NgClass, NgIf } from "@angular/common";
import { MatTooltip } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { DeleteConfirmationDialogComponent } from "../delete-confirmation-dialog/delete-confirmation-dialog.component";
import { trigger, transition, style, animate } from "@angular/animations";
import { ExamsTableComponent } from "../exams-table/exams-table.component";

type FilterFn = (exams: Exam[]) => Exam[];
type ExamFilter = {
  active: boolean;
  filter: FilterFn;
}


@Component({
  selector: "app-exams-pool",
  standalone: true,
  imports: [ExamCardComponent, MatIconModule, NgClass, MatTooltip, NgIf, ExamsTableComponent],
  templateUrl: "./exams-pool.component.html",
  styleUrl: "./exams-pool.component.scss",
  animations: [
    trigger(
      'leftRightAnimation',
      [
        transition(
          ':enter',
          [
            style({ height: 0, opacity: 0, transform: 'translateX(100%)' }),
            animate('0.25s ease-out',
              style({ height: '*', opacity: 1, transform: 'translateX(0%)' })
            )
          ]
        ),
        transition(
          ':leave',
          [
            style({ height: '*', opacity: 1, transform: 'translateX(0%)' }),
            animate('0.25s ease-in',
              style({ height: 0, opacity: 0, transform: 'translateX(-100%)' })
            )
          ]
        )
      ],

    ),

  ]
})
export class ExamsPoolComponent implements OnInit {
  public exams: Exam[] = [];
  public filteredExams: Exam[] = [];
  public downloadableJobs: DownloadableJob[] = [];

  private username: string = "";

  public showDropdowns = { sorting: false, filter: false };
  public viewMode: "grid" | "list" = "grid";

  @HostListener("document:click", ["$event"])
  handleDropdownStates(event: MouseEvent) {
    const elementId = (event.target as Element).id;

    if (elementId === "openSortingDropdown") {
      this.showDropdowns.sorting = !this.showDropdowns.sorting;
    } else {
      this.showDropdowns.sorting = false;
    }

    if (elementId === "openFilterDropdown") {
      this.showDropdowns.filter = !this.showDropdowns.filter;
    } else {
      this.showDropdowns.filter = false;
    }
  }

  constructor(
    private api: ApiService,
    private loader: LoadingService,
    private router: Router,
    private dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.viewMode = localStorage.getItem("viewMode") === "list" ? "list" : "grid";
    this.fetchExams();
    this.fetchCurrentUser();
  }

  private fetchExams() {
    this.loader.loadingOn();
    forkJoin({
      allExams: this.api.getExams(),
      downloadableJobs: this.api.getDownloadableJobs(),
    }).subscribe({
      next: ({ allExams, downloadableJobs }) => {
        this.exams = allExams;
        this.filteredExams = allExams;
        this.downloadableJobs = downloadableJobs;
        this.loader.loadingOff();
      },
      error: (err) => {
        console.error("Error fetching initial data for exams pool:", err);
        this.loader.loadingOff();
      },
    });
  }

  private fetchCurrentUser() {
    this.api.getUser().subscribe(
      user => {
        this.username = user.id
      }
    )
  }

  isDownloadable(examId: string | undefined): boolean {
    if (!examId) return false;
    return this.downloadableJobs.some((job) => job.examId === examId);
  }

  onEdit(examId: string | undefined) {
    if (!examId) return;
    this.router.navigate(["/create-exam", examId]);
  }

  onDownload(event: MouseEvent, examId: string | undefined) {
    event.stopPropagation();
    if (!examId) {
      console.error("Exam ID is undefined, cannot start download.");
      return;
    }

    const job = this.downloadableJobs.find((j) => j.examId === examId);
    if (!job) {
      console.error("No downloadable job found for examId:", examId);
      return;
    }

    this.downloadExam(job.jobId);
  }

  private downloadExam(jobId: string) {
    this.loader.loadingOn();
    this.api.downloadMassExamResult(jobId).subscribe({
      next: (zipBlob: Blob) => {
        saveAs(zipBlob, `exams_${jobId}.zip`);
        this.loader.loadingOff();
      },
      error: (err) => {
        console.error("Download error:", err);
        this.loader.loadingOff();
      },
    });
  }

  public onDeleteExam(event: MouseEvent, examId: string | undefined) {
    event.stopPropagation(); // Stop click from triggering onEdit
    if (!examId) return;

    // Find the exam object to get the name for the dialog
    const examToDelete = this.exams.find((e) => e._id === examId);
    const examName = examToDelete ? examToDelete.courseName : "this exam";

    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: "400px",
      data: { courseName: examName },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.performDeletion(examId);
        this.fetchExams();
      }
    });
  }

  private performDeletion(examId: string) {
    this.loader.loadingOn();
    this.api.deleteExam(examId).subscribe({
      next: () => {
        this.loader.loadingOff();
        // Remove from local array so we don't need to refetch
        this.exams = this.exams.filter((e) => e._id !== examId);
        // this.router.navigate(["exams-pool"]); // No need to navigate if we are already here
      },
      error: (err) => {
        console.error("Delete exam error:", err);
        this.loader.loadingOff();
      },
    });
  }

  public onRecentlyViewed() {
    this.filters.filterRecentlyViewed.active = true;
    this.filters.filterMyExams.active = false;
    this.filters.filterRelevantExams.active = false;
    this.applyFilters();
  }

  public onMyExams() {
    this.filters.filterMyExams.active = true;
    this.filters.filterRecentlyViewed.active = false;
    this.filters.filterRelevantExams.active = false;
    this.applyFilters();
  }

  public onRelevantExams() {
    this.filters.filterRelevantExams.active = true;
    this.filters.filterRecentlyViewed.active = false;
    this.filters.filterMyExams.active = false;
    this.applyFilters();
  }

  public onSortAlphabetically() {
    this.filters.sortAlphabetically.active = true;
    this.filters.sortSemester.active = false;
    this.filters.sortLastViewed.active = false;
    this.applyFilters();
  }

  public onSortSemester() {
    this.filters.sortAlphabetically.active = false;
    this.filters.sortSemester.active = true;
    this.filters.sortLastViewed.active = false;
    this.applyFilters();
  }

  public onSortLastViewed() {
    this.filters.sortAlphabetically.active = false;
    this.filters.sortSemester.active = false;
    this.filters.sortLastViewed.active = true;
    this.applyFilters();
  }

  public onSortAscending() {
    this.filters.sortAscending.active = true;
    this.applyFilters();
  }

  public onSortDescending() {
    this.filters.sortAscending.active = false;
    this.applyFilters();
  }

  private applyFilters() {
    const activeFilters = Object.values(this.filters).filter(f => f.active).map(f => f.filter);
    this.filteredExams = activeFilters.reduce((result, filter) => filter(result), [...this.exams]);
  }

  public filters = {
    filterRecentlyViewed: {
      active: true,
      filter: (exams: Exam[]) => { console.log("recentlyViewed not implemented"); return exams; }
    },
    filterMyExams: {
      active: false,
      filter: (exams: Exam[]) => exams.filter(exam => exam.examinerName === this.username)
    },
    filterRelevantExams: {
      active: false,
      filter: (exams: Exam[]) => exams.filter(exam => exam.date >= new Date().toISOString())
    },
    sortAlphabetically: {
      active: true,
      filter: (exams: Exam[]) => [...exams].sort((a, b) => a.courseName.localeCompare(b.courseName))
    },
    sortSemester: {
      active: false,
      filter: (exams: Exam[]) => [...exams].sort((a, b) => a.semester.localeCompare(b.semester))
    },
    sortLastViewed: {
      active: false,
      filter: (exams: Exam[]) => { console.log("lastViewed not implemented"); return exams; }
    },
    sortAscending: {
      active: false,
      filter: (exams: Exam[]) => exams.reverse()
    }
  }

  public currentSortString(): string {
    if (this.filters.sortAlphabetically.active) return "Alphabetically";
    if (this.filters.sortSemester.active) return "By Semester";
    return "Last Viewed";
  }

  public toggleViewMode(mode: "grid" | "list") {
    this.viewMode = mode;
    localStorage.setItem("viewMode", mode);
  }
}
