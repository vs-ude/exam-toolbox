import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Tag } from '../../tag';
import { RouterModule } from '@angular/router';
import { ExamCardComponent } from "../exam-card/exam-card.component";
import { TaskPoolCardComponent } from "../task-pool-card/task-pool-card.component"; // Import RouterModule
import { AsyncPipe, JsonPipe, NgIf, NgStyle } from '@angular/common';
import { Exam, Task } from '../../exam';


@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterModule, ExamCardComponent, TaskPoolCardComponent, AsyncPipe, NgIf, JsonPipe, NgStyle],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {

  public filteredTagsWithTasks: { tag: Tag, tasks: Task[] }[] = [];
  public questionMatches: Task[] = [];
  public examMatches: Exam[] = [];

  constructor(
    private router: Router,
    private api: ApiService,
    private route: ActivatedRoute,
  ) {

    this.route.params.subscribe(params => {
      this.filterTags()
      this.filterTasks();
      this.filterExams();
    })
  }

  private filterTags() {
    const searchString = this.getSearchString();
    if (searchString === "") { return; }

    this.api.getAllTags().subscribe(
      tags => {
        let filteredTags = tags.filter(tag =>
          tag.name.toLowerCase().includes(searchString.toLowerCase())
        );

        this.filteredTagsWithTasks = filteredTags.map(tag => ({ tag, tasks: [] }));

        for (let i = 0; i < this.filteredTagsWithTasks.length; i++) {
          const tagId = this.filteredTagsWithTasks[i].tag._id!;
          this.api.getTasksByTagId(tagId).subscribe(
            tasks => {
              this.filteredTagsWithTasks[i].tasks = tasks;
            },
            err => console.error(`Error fetching tasks for tag ${tagId}`, err)
          );
        }
      },
      err => console.error("Error fetching tags", err)
    )
  }



  private getSearchString(): string {
    const lastURLPart = this.router.url.split("/").pop();
    if (lastURLPart === undefined || lastURLPart === "search") {
      console.warn("no search text detected");
      return "";
    }
    return lastURLPart
  }

  private filterTasks() {
    const searchString = this.getSearchString();
    if (searchString === "") { return; }
    this.questionMatches = [];
    this.api.getTasksWithQuestionTextFromPool(searchString).subscribe(
      res => {
        this.questionMatches = res;
        console.log("Question text matches:", this.questionMatches);
      },
      err => { console.error("Error fetching Tasks by question text"), err }
    )
  }

  private filterExams() {
    const searchString = this.getSearchString();
    if (searchString === "") { return; }
    this.api.getExamsWithSearchText(searchString).subscribe(
      res => {
        this.examMatches = res;
        console.log("Exam matches:", this.examMatches);
      },
      err => { console.error("Error fetching Exams by search text"), err }
    )
  }


  public onExamClick(exam: Exam) {
    if (exam._id == undefined) {
      console.warn(`Exam ${exam.courseName} ${exam.semester} has no ExamID`);
      return;
    };
    this.router.navigate([`/create-exam/${exam._id}`])
  }

  public onTaskClick(task: Task) {
    console.log("Task clicked:", task);
  }

}
