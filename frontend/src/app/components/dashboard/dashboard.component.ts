import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DbService } from '../../services/db.service';
import { MatIconModule } from '@angular/material/icon';
import { ExamCardComponent } from '../exam-card/exam-card.component';
import { NgClass, NgFor } from '@angular/common';

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



  onDBTest() {
    const name = 'Cloud, Web & Mobile'
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
