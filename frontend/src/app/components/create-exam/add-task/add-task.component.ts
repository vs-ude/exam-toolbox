import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-AddTask',
  standalone: true,
  imports: [NgStyle, ],
  templateUrl: './add-task.component.html',
  styleUrl: './add-task.component.scss'
})
export class AddTaskComponent {
  @Input() public name!: string ;
  @Input() public color!: string;
  @Input() public iconName!: string;

  public hovered = false; 



  


  constructor(){

  }

  
}
