import { Component, Input, input } from '@angular/core';
import { Task } from '../../exam';
import { MatIconModule } from '@angular/material/icon';
import { ColorProviderService } from '../../services/color-provider.service';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-task-pool-card',
  standalone: true,
  imports: [MatIconModule, NgStyle],
  templateUrl: './task-pool-card.component.html',
  styleUrl: './task-pool-card.component.scss'
})
export class TaskPoolCardComponent {
  @Input() task!: Task;
  public taskColor: string = "";
  public mouseHovering: boolean = false;

  constructor(
    private colorProvider: ColorProviderService
  ){}
  
  ngOnInit() {
    this.taskColor = this.colorProvider.getTaskColor(this.task.type)
  }
}
