import { NgStyle } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-AddTask',
  imports: [NgStyle, CdkDrag],
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

  @Input() dragData: unknown;

  public hovered = false;
  public readonly publicPath = environment.publicPath;

  constructor() {}
}
