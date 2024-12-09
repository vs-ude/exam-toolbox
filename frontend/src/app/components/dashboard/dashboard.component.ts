import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DbService } from "../../services/db.service";
import { MatIconModule } from '@angular/material/icon';
import { ExamCardComponent } from "../exam-card/exam-card.component";
import { NgClass, NgFor } from '@angular/common';
import { Exam } from '../../exam';
import { ApiService } from '../../services/api.service';
import { saveAs } from 'file-saver';
import { Router } from '@angular/router';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, ExamCardComponent, NgFor, NgClass],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {


  constructor(
    private dbService: DbService,
    private api: ApiService,
    private router: Router,
  ) { }


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

  public examNames = [
    "Cloud, Web & Mobile",
    "Rechnernetze",
    "Betriebssysteme",
    "Verteilte Systeme",
    "Sicherheit in Kommunikationsnetzen",
    "Rechnerarchitektur",
  ]


  onAddExam(){
    this.router.navigate(['/create-exam']);  }

  addExam() {
    const title = 'Cloud, Web & Mobile'
    const questions = [
      {question: 'What is Cloud?', points: 4},
      {question: 'What is Web & Mobile?', points: 6}
    ]
    const exam: Exam = new Exam(title, questions)

    this.dbService.addExam(exam).subscribe({
      next: (response) => {
        console.log('Exam added successfully:', response);
      },
      error: (error) => {
        console.error('Error adding exam:', error);
      }
    })

    this.api.generateExamLatex(exam).subscribe({
      next: (examPDF: Blob) => {
        saveAs(examPDF, `${exam.title}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }
}
