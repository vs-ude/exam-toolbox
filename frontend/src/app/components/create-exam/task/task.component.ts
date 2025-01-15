import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
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


  options: string[] = ['Option 1'];
  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  isQuestionActive: boolean = false;

  private selectionRange: Range | null = null; // Speichert die aktuelle Cursorposition

  // Frage aktualisieren
  updateQuestion(event: Event) {
    const element = event.target as HTMLElement;
    console.log('Aktuelle Frage:', element.innerHTML);
  }

  // Fügt eine neue Antwortoption hinzu
  addOption() {
    this.options.push('');
  }

  // Entfernt eine Antwortoption
  removeOption(index: number) {
    if (this.options.length > 1) {
      this.options.splice(index, 1);
    }
  }

  // Speichert die Cursorposition
  saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.selectionRange = selection.getRangeAt(0);
    }
  }

  // Stellt die gespeicherte Cursorposition wieder her
  restoreSelection() {
    const selection = window.getSelection();
    if (this.selectionRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.selectionRange);
    }
  }

  // Setzt das Textformat (Bold, Italic, Underline)
  setFormat(format: string) {
    this.restoreSelection(); // Cursorposition wiederherstellen
    document.execCommand(format); // Wendet das Format an
    this.updateButtonStates();
  }

  // Aktualisiert den Status der Buttons (ob sie aktiv sind)
  updateButtonStates() {
    this.isBold = document.queryCommandState('bold');
    this.isItalic = document.queryCommandState('italic');
    this.isUnderline = document.queryCommandState('underline');
  }

  // Verhindert ungewollte Aktionen beim Eingeben
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  // Setzt den Fokusstatus auf "aktiv"
  onFocus() {
    this.isQuestionActive = true;
    this.saveSelection(); // Speichert die aktuelle Cursorposition
  }

  // Setzt den Fokusstatus auf "inaktiv"
  onBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.tagName === 'BUTTON') {
      return; // Verhindert das Setzen auf "inaktiv", wenn ein Button gedrückt wird
    }
    this.isQuestionActive = false;
  }
}
