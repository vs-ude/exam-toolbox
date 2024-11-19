import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DbService } from '../../services/db.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  constructor(
    private dbService: DbService
  ){}


  onDBTest(){
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
