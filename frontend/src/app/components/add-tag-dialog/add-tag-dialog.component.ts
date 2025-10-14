import { NgStyle } from '@angular/common';
import { Component, Inject, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { Tag } from '../../tag';

@Component({
  selector: 'app-add-tag-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, FormsModule, NgStyle],
  templateUrl: './add-tag-dialog.component.html',
  styleUrl: './add-tag-dialog.component.scss'
})
export class AddTagDialogComponent {
  public tags: Tag[] = [];

  public name: string = "Tag";
  public color: string = "#81c784";
  public textColor: string = "#ffffff";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {},
    private api: ApiService) {

  }

  ngOnInit() {
    this.api.getAllTags().subscribe(
      tags => { this.tags = tags.map(tag => Tag.fromPlain(tag));
       },
      err => {
        console.error("error fetching tags", err);
      }
    )
  }
}
