import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';

import { Theme, ThemeToggleService } from '../../services/theme-toggle.service';

@Component({
  selector: 'app-delete-confirmation-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './delete-confirmation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './delete-confirmation-dialog.component.scss',
})
export class DeleteConfirmationDialogComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  private themeSub?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<DeleteConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { courseName: string },
    private themeService: ThemeToggleService,
  ) {}

  ngOnInit() {
    this.themeSub = this.themeService.themeChanged$.subscribe(
      (theme: Theme) => {
        this.isDarkTheme = theme === Theme.DARK;
      },
    );
  }

  ngOnDestroy() {
    this.themeSub?.unsubscribe();
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
