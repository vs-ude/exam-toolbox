import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import {
  LatexPreviewsService,
  LatexPreview,
} from '../../../../services/latex-previews.service';

@Component({
  selector: 'app-preview-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './preview-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './preview-dialog.component.scss',
})
export class PreviewDialogComponent {
  previews: LatexPreview[] = [];

  constructor(private previewService: LatexPreviewsService) {
    this.previews = this.previewService.getPreviews();
  }
}
