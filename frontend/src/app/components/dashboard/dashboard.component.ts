import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DbService } from '../../services/db.service';
import { MatIconModule } from '@angular/material/icon';
import { ExamCardComponent } from '../exam-card/exam-card.component';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, ExamCardComponent, NgFor],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  constructor(
    private dbService: DbService
  ) { }

  public examNames = [
    "Cloud, Web & Mobile",
    "Rechnernetze",
    "Betriebssysteme",
    "Verteilte Systeme",
    "Sicherheit in Kommunikationsnetzen",
    "Rechnerarchitektur",
  ]


  onDBTest() {
    const name = 'Sample Exam'
    const comment = 'This is a sample exam comment'
    this.dbService.addExam(name, comment).subscribe(
      (response) => {
        console.log('Exam added successfully:', response)
      },
      (error) => {
        console.error('Error adding exam:', error)
      }
    );

    this.dbService.addExam("sd", "df")
  }
}
