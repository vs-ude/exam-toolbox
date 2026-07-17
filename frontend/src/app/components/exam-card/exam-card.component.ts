import { Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-exam-card',
  imports: [MatIcon],
  templateUrl: './exam-card.component.html',
  styleUrl: './exam-card.component.scss',
})
export class ExamCardComponent {
  @Input() name!: string;

  public lastEdited = 2;
}
