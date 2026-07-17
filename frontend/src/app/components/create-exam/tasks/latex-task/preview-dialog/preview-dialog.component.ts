import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';

import {
  LatexPreviewsService,
  LatexPreview,
} from '../../../../../services/latex-previews.service';

@Component({
  selector: 'app-preview-dialog',
  imports: [MatDialogModule],
  templateUrl: './preview-dialog.component.html',
  styleUrl: './preview-dialog.component.scss',
})
export class PreviewDialogComponent {
  previews: LatexPreview[] = [];

  constructor(private previewService: LatexPreviewsService) {
    this.previews = this.previewService.getPreviews();
  }
}
