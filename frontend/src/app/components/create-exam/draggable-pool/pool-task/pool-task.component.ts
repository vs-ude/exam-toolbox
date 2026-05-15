import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Task } from '../../../../exam';

@Component({
  selector: 'app-pool-task',
  standalone: true,
  imports: [],
  templateUrl: './pool-task.component.html',
  styleUrl: './pool-task.component.scss'
})
export class PoolTaskComponent {
    @Input() public task!: Task;
    @Input() public color!: string;
    @Input() public iconName!: string;
  
    public hovered = false; 
  
  
    constructor(){
  
    }

}
