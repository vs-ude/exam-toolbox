import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    MatCardModule,
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    NgStyle,
    NgIf,
  ],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent {
  @Input() public name!: string;


  answerOptions: string[] = ['Option 1'];
  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  isQuestionActive: boolean = false;

  private question: string = '';

  updateQuestion(event: Event) {
    const element = event.target as HTMLElement;
    this.question = element.innerHTML;
    console.log('Aktuelle Frage:', this.question);
  }


  addOption() {
    this.answerOptions.push('');
  }

  removeOption(index: number) {
    if (this.answerOptions.length > 1) {
      this.answerOptions.splice(index, 1);
    }
    console.log(this.answerOptions);
  }

  changeOption(event: any, index: number) {
    this.answerOptions[index] = event.target.value;
    console.log(this.answerOptions);
  }

  setQuestionFormat(format: string, event: MouseEvent) {
    event.preventDefault();
    document.execCommand(format);
    this.updateButtonStates();

  }

  updateButtonStates() {
    this.isBold = document.queryCommandState('bold');
    this.isItalic = document.queryCommandState('italic');
    this.isUnderline = document.queryCommandState('underline');
  }


  public activateFormatButtons() {
    this.isQuestionActive = true;
  }


  public deactivateFormatButtons(event: FocusEvent) {
    this.isQuestionActive = false;
  }
}
