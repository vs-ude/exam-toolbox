import { Component, Input, input } from '@angular/core';
import { Task } from '../../exam';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-task-pool-card',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './task-pool-card.component.html',
  styleUrl: './task-pool-card.component.scss'
})
export class TaskPoolCardComponent {
  @Input() task!: Task;

}
