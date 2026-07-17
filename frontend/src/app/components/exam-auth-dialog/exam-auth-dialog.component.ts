import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogTitle,
  MatDialogActions,
} from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { map, Observable, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { ApiService } from '../../services/api.service';

export interface ExamAuthDialogData {
  users: string[];
  groups: string[];
}

export interface ExamAuthDialogResult {
  users: string[];
  groups: string[];
}

@Component({
  selector: 'app-exam-auth-dialog',
  imports: [
    CommonModule,
    AsyncPipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './exam-auth-dialog.component.html',
  styleUrl: './exam-auth-dialog.component.scss',
})
export class ExamAuthDialogComponent implements OnInit {
  public isLoading = true;

  // Selected values
  public selectedUsers: string[] = [];
  public selectedGroups: string[] = [];

  // All available options (fetched from API)
  public allUsers: string[] = [];
  public allGroups: string[] = [];

  // Input controls for the chip fields
  public userInputCtrl = new FormControl('');
  public groupInputCtrl = new FormControl('');

  // Filtered options for autocomplete
  public filteredUsers$!: Observable<string[]>;
  public filteredGroups$!: Observable<string[]>;

  @ViewChild('userInput') userInputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('groupInput') groupInputEl!: ElementRef<HTMLInputElement>;

  constructor(
    public dialogRef: MatDialogRef<ExamAuthDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExamAuthDialogData,
    private apiService: ApiService,
  ) {
    this.selectedUsers = [...(data.users ?? [])];
    this.selectedGroups = [...(data.groups ?? [])];
  }

  ngOnInit() {
    this.apiService.getUsersAndGroups().subscribe(result => {
      this.allUsers = result.users.map(u => u.sub);
      this.allGroups = result.groups.map(g => g.name);

      this.filteredUsers$ = this.userInputCtrl.valueChanges.pipe(
        startWith(''),
        map(value =>
          this._filter(value ?? '', this.allUsers, this.selectedUsers),
        ),
      );

      this.filteredGroups$ = this.groupInputCtrl.valueChanges.pipe(
        startWith(''),
        map(value =>
          this._filter(value ?? '', this.allGroups, this.selectedGroups),
        ),
      );

      this.isLoading = false;
    });
  }

  private _filter(value: string, all: string[], selected: string[]): string[] {
    const lower = value.toLowerCase();
    return all.filter(
      item => !selected.includes(item) && item.toLowerCase().includes(lower),
    );
  }

  openPanel(trigger: MatAutocompleteTrigger) {
    setTimeout(() => trigger.openPanel());
  }

  addUser(event: MatAutocompleteSelectedEvent) {
    const value = event.option.viewValue;
    if (value && !this.selectedUsers.includes(value)) {
      this.selectedUsers.push(value);
    }
    this.userInputCtrl.setValue('');
    this.userInputEl.nativeElement.value = '';
  }

  removeUser(user: string) {
    const index = this.selectedUsers.indexOf(user);
    if (index >= 0) {
      this.selectedUsers.splice(index, 1);
      // Re-trigger the filter pipe
      this.userInputCtrl.setValue(this.userInputCtrl.value);
    }
  }

  addGroup(event: MatAutocompleteSelectedEvent) {
    const value = event.option.viewValue;
    if (value && !this.selectedGroups.includes(value)) {
      this.selectedGroups.push(value);
    }
    this.groupInputCtrl.setValue('');
    this.groupInputEl.nativeElement.value = '';
  }

  removeGroup(group: string) {
    const index = this.selectedGroups.indexOf(group);
    if (index >= 0) {
      this.selectedGroups.splice(index, 1);
      this.groupInputCtrl.setValue(this.groupInputCtrl.value);
    }
  }

  onSave() {
    const result: ExamAuthDialogResult = {
      users: this.selectedUsers,
      groups: this.selectedGroups,
    };
    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
