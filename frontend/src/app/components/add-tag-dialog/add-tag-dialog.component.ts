import { NgStyle } from '@angular/common';
import {
  Component,
  Inject,
  NgModule,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { ApiService } from '../../services/api.service';
import { TagHelperService } from '../../services/tag-helper.service';
import { Tag } from '../../types/shared/tag';

export interface AddTagDialogData {
  _id: string;
  name: string;
  color: string;
  textColor: string;
  exists: boolean;
}

@Component({
  selector: 'app-add-tag-dialog',
  imports: [MatDialogModule, MatButtonModule, FormsModule, NgStyle],
  templateUrl: './add-tag-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './add-tag-dialog.component.scss',
})
export class AddTagDialogComponent {
  public tags: Tag[] = [];

  public name: string = 'Tag';
  public color: string = '#81c784';
  public textColor: string = '#ffffff';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {},
    private api: ApiService,
    private tagHelper: TagHelperService,
  ) {}

  ngOnInit() {
    this.api.getAllTags().subscribe(
      tags => {
        this.tags = tags;
      },
      err => {
        console.error('error fetching tags', err);
      },
    );
  }

  public onColorChange(bgColor: string) {
    this.textColor = this.tagHelper.calcFontColor(bgColor);
  }
}
