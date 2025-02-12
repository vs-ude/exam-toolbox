import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ExamCardComponent } from "../exam-card/exam-card.component";
import { NgClass, NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Exam } from '../../exam';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, ExamCardComponent, NgFor, NgClass],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  exams: Exam[] = []


  constructor(
    private router: Router,
    private api: ApiService
  ) { }


  ngOnInit(){
    this.api.getExams().subscribe(res => {
      this.exams = res
      console.table(this.exams)
    })
  }


  @HostListener("document:click", ["$event"])
  handleDropdownStates(event: MouseEvent) {
    const elementId = (event.target as Element).id

    if (elementId === "openSortingDropdown") {
      this.showDropdowns.sorting = !this.showDropdowns.sorting;
    } else { this.showDropdowns.sorting = false; }

    if (elementId === "openFilterDropdown") {
      this.showDropdowns.filter = !this.showDropdowns.filter;
    } else { this.showDropdowns.filter = false; }
  }

  public showDropdowns = { sorting: false, filter: false, }

  onAddExam(){
    this.router.navigate(['/create-exam']);  
  }

  onDebug(){
    this.router.navigate(['/debug'])
  }

  onExamClick(exam: Exam){
    console.log(this.router.url)
    console.log('Exam clicked: ' + exam.courseName + ', ' + exam.semester + ', ' + exam._id)
    if(exam._id == undefined){
      console.warn(`Exam ${exam.courseName} ${exam.semester} has no ExamID`);
      return;
    };
    this.api.getExam(exam._id).subscribe(
      response => {
        console.log('Fetched Exam successfully ', response);
      },
      error => {
        console.error('Error fetching exam: ', error);
      }
    )
  }

}
