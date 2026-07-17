import { NgStyle } from '@angular/common';
import {
  Component,
  inject,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-AddTask',
  imports: [NgStyle],
  templateUrl: './add-task.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './add-task.component.scss',
})
export class AddTaskComponent {
  @Input()
  public name!: string;
  @Input()
  public color!: string;
  @Input()
  public iconName!: string;

  public hovered = false;
  public readonly publicPath = environment.publicPath;

  constructor() {}
}
