import { NgStyle } from '@angular/common';
import { Component, Inject, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-add-tag-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, FormsModule, NgStyle],
  templateUrl: './add-tag-dialog.component.html',
  styleUrl: './add-tag-dialog.component.scss'
})
export class AddTagDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { }) { }


  name: string = "Tag";
  color: string = "#81c784";
  textColor: string = "#ffffff";


}
