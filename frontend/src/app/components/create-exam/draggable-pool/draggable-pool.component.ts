import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../../../exam';
import { AddTaskComponent } from "../add-task/add-task.component";
import { ColorProviderService } from '../../../services/color-provider.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-draggable-pool',
  standalone: true,
  imports: [AddTaskComponent, MatTooltipModule],
  templateUrl: './draggable-pool.component.html',
  styleUrl: './draggable-pool.component.scss'
})
export class DraggablePoolComponent implements AfterViewInit {

  @Input() public taskPool!: Task[];

  @Output() dragStart = new EventEmitter<DragEvent>();
  @Output() drop = new EventEmitter<DragEvent>();

  constructor(public colorProvider: ColorProviderService) {
  }

  async ngAfterViewInit() {
    function delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    for (let i = 0; i<20; i++){
      console.log(this.taskPool);
      await delay(10000);
    }
  }



  public onSearch(search: string): void {
    console.log("Searching for tasks with term: ", search);
  }


}
