import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent {
  @Input() public name!: string ;
  @Input() public color!: string;
  @Input() public iconName!: string;

  public hovered = false; 



  


  constructor(){

  }

  
}
