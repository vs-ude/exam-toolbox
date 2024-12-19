import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ExamCardComponent } from "../exam-card/exam-card.component";
import { NgClass, NgFor } from '@angular/common';
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
    "Cloud Web Mobile",
    "Rechnernetze",
    "Betriebssysteme",
    "Verteilte Systeme",
    "Sicherheit in Kommunikationsnetzen",
    "Rechnerarchitektur",
  ]


  onAddExam(){
    this.router.navigate(['/create-exam']);  
  }

  onDebug(){
    this.router.navigate(['/debug'])
  }

}
