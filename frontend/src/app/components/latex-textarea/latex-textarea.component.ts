import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  LatexFormat,
  applyLatexFormat,
  isCursorInFormat,
} from '../../services/latex-format.service';
import { TaskAnimations } from '../tasks/task-animations';

@Component({
  selector: 'app-latex-textarea',
  imports: [
    FormsModule,
    TextFieldModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './latex-textarea.component.html',
  styleUrl: './latex-textarea.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [TaskAnimations.inOutAnimation],
})
export class LatexTextareaComponent implements OnChanges {
  @Input() public label: string = '';
  @Input() public value: string = '';
  @Output() public valueChange = new EventEmitter<string>();

  @ViewChild('textareaEl') textareaEl!: ElementRef<HTMLTextAreaElement>;

  private readonly cdr = inject(ChangeDetectorRef);

  public isActive = signal(false);
  public isBold = signal(false);
  public isItalic = signal(false);
  public isUnderline = signal(false);
  public isMonospace = signal(false);
  public isMath = signal(false);

  /** Drives the [ngModel] binding so Material tracks the value for label floating. */
  public internalValue: string = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      // Accept every incoming value (including the first) so the label floats
      // correctly when content is pre-filled from a loaded task.
      if (this.internalValue !== this.value) {
        this.internalValue = this.value;
        this.cdr.markForCheck();
      }
    }
  }

  public onFocus() {
    this.isActive.set(true);
    this.updateButtonStates();
  }

  public onBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (relatedTarget?.closest('.form-toolbar')) return;
    this.isActive.set(false);
  }

  public onSelectionChange() {
    this.updateButtonStates();
  }

  public onInput(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    this.internalValue = el.value;
    this.valueChange.emit(el.value);
    this.updateButtonStates();
  }

  public applyFormat(format: LatexFormat, event: MouseEvent) {
    event.preventDefault(); // keep focus on textarea

    const el = this.textareaEl.nativeElement;
    const result = applyLatexFormat(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      format,
    );

    // Replace via execCommand so the change is recorded in the browser undo stack.
    el.focus();
    el.setSelectionRange(0, el.value.length);
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand('insertText', false, result.value);
    el.setSelectionRange(result.selStart, result.selEnd);

    this.internalValue = el.value;
    this.valueChange.emit(el.value);
    this.updateButtonStates();
  }

  private updateButtonStates() {
    const el = this.textareaEl?.nativeElement;
    if (!el) return;
    const { value, selectionStart: s, selectionEnd: e } = el;
    this.isBold.set(isCursorInFormat(value, s, e, 'bold'));
    this.isItalic.set(isCursorInFormat(value, s, e, 'italic'));
    this.isUnderline.set(isCursorInFormat(value, s, e, 'underline'));
    this.isMonospace.set(isCursorInFormat(value, s, e, 'monospace'));
    this.isMath.set(isCursorInFormat(value, s, e, 'math'));
  }
}
