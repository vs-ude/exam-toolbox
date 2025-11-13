import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Tag } from '../../tag';
import { RouterModule } from '@angular/router';
import { ExamCardComponent } from "../exam-card/exam-card.component";
import { TaskPoolCardComponent } from "../task-pool-card/task-pool-card.component"; // Import RouterModule
import { Observable } from 'rxjs';
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

  private filteredTags: Tag[] = [];
  public tagRefs: { tag: Tag, exams: Observable<Exam>[], tasks: Observable<Task>[] }[] = [];
  public questionMatches: Task[] = [];

  constructor(
    private router: Router,
    private api: ApiService,
    private route: ActivatedRoute,
  ) {

    this.route.params.subscribe(params => {
      this.filterTags()
      this.filterTasks();
    })
  }

  private getRefsOfTag() {
    this.tagRefs = [];
    for (const tag of this.filteredTags) {
      const exams: Observable<Exam>[] = [];
      const tasks: Observable<Task>[] = [];
      tag.getUsedBy().forEach(ref => {
        if (ref.type === "exam") {
          const examObservable: Observable<Exam> = this.api.getExam(ref.id)
          exams.push(examObservable);
        } else {
          const taskObservable: Observable<Task> = this.api.getTaskWithIdFromPool(ref.id);
          tasks.push(taskObservable);
        }
      })
      this.tagRefs.push({ tag: tag, exams: exams, tasks: tasks });
    }
  }

  private filterTags() {
    const searchString = this.getSearchString();
    if (searchString === "") { return; }

    this.api.getAllTags().subscribe(
      res => {
        const tags = res.map(tag => Tag.fromPlain(tag));
        this.filteredTags = tags.filter(tag => tag.getName().toLowerCase().includes(searchString.toLowerCase()))
        this.getRefsOfTag();
      },
      err => { console.error("Error fetching Tag list"), err }
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
