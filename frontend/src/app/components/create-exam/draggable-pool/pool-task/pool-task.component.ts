import { CommonModule } from '@angular/common';
import { Component, Input, ElementRef } from '@angular/core';
import { Task } from '../../../../exam';

@Component({
  selector: 'app-pool-task',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pool-task.component.html',
  styleUrl: './pool-task.component.scss'
})
export class PoolTaskComponent {
    @Input() public task!: Task;
    @Input() public color!: string;
    @Input() public iconName!: string;
  
    public hovered = false;
    public tooltipVisible = false;
    private tooltipTimeout?: number;
    private readonly tooltipDelay = 800;
  
    constructor() {}
  
    public onMouseEnter(): void {
        this.hovered = true;
        this.tooltipTimeout = window.setTimeout(() => this.tooltipVisible = true, this.tooltipDelay);
    }
  
    public onMouseLeave(): void {
        this.hovered = false;
        this.tooltipVisible = false;
        if (this.tooltipTimeout !== undefined) {
            window.clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = undefined;
        }
    }

}
