import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

export const COMMON_IMPORTS = [
  NgIf,
  NgStyle,
  NgFor,
  NgClass,
  FormsModule,
  MatIconModule,
  MatCardModule,
  MatButtonToggleModule,
  MatInputModule,
  MatTooltipModule,
];
