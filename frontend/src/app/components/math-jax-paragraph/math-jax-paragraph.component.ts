import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MathJaxService } from '../../services/math-jax.service';

@Component({
  selector: 'app-math-jax-paragraph',
  imports: [],
  templateUrl: './math-jax-paragraph.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './math-jax-paragraph.component.scss',
})
export class MathJaxParagraphComponent {
  @ViewChild('mathParagraph') paragraphElement: any;
  @Input({ required: true }) mathString!: string;

  ngOnChanges() {
    if (this.paragraphElement) {
      this.paragraphElement.nativeElement.innerHTML = this.mathString;
      this.mathJaxService.render();
    }
  }

  constructor(private mathJaxService: MathJaxService) {}

  ngOnInit() {
    this.mathJaxService.getMathJaxLoadedPromise().then(() => {
      console.log('MathJax loaded, rendering math');

      // Insert the input string
      this.paragraphElement.nativeElement.innerHTML = this.mathString;

      // Render the Latex
      this.mathJaxService.render();
    });
  }
}
