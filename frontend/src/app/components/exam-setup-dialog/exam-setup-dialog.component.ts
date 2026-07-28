import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogTitle,
  MatDialogActions,
} from '@angular/material/dialog';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { map, Observable, startWith } from 'rxjs';

import { Exam } from '../../types/shared/exam';
import { ApiService } from '../../services/api.service';
import { getSemesters, newDefaultExam } from '../../services/exam.service';

export interface ExamSetupDialogData {
  exam?: Exam;
}

@Component({
  selector: 'app-exam-setup-dialog',
  imports: [
    AsyncPipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatStepperModule,
  ],
  templateUrl: './exam-setup-dialog.component.html',
  styleUrl: './exam-setup-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ExamSetupDialogComponent implements OnInit {
  public isLoading = true;
  public isNew: boolean = false;

  // Step form groups (used in stepper mode and also as the backing groups in flat mode)
  public nameFormGroup!: FormGroup;
  public dateFormGroup!: FormGroup;
  public miscFormGroup!: FormGroup;

  public semesters: string[] = [];
  public filteredSemesters$!: Observable<string[]>;

  public allUsers: string[] = [];
  public allGroups: string[] = [];
  public selectedUsers: string[] = [];
  public selectedGroups: string[] = [];

  public filteredUsers$!: Observable<string[]>;
  public filteredGroups$!: Observable<string[]>;

  public userInputCtrl = new FormControl('');
  public groupInputCtrl = new FormControl('');

  @ViewChild('userInput') userInputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('groupInput') groupInputEl!: ElementRef<HTMLInputElement>;

  constructor(
    public dialogRef: MatDialogRef<ExamSetupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExamSetupDialogData,
    private fb: FormBuilder,
    private apiService: ApiService,
  ) {
    this.semesters = getSemesters();
  }

  ngOnInit() {
    const exam = this.data?.exam;
    this.isNew = !exam;

    const defaults = exam ?? newDefaultExam(this.apiService);

    this.nameFormGroup = this.fb.group({
      courseName: [defaults.courseName, Validators.required],
      examinerName: [defaults.examinerName, Validators.required],
    });

    this.dateFormGroup = this.fb.group({
      semester: [defaults.semester, Validators.required],
      date: [this.parseDateString(defaults.date), Validators.required],
      examLengthMinutes: [
        defaults.examLengthMinutes,
        [Validators.required, Validators.min(0)],
      ],
    });

    this.miscFormGroup = this.fb.group({
      bilingual: [defaults.bilingual ?? false],
      conceptPages: [defaults.conceptPagesManual ?? 2],
    });

    this.selectedUsers = [...(defaults.access?.users ?? [])];
    this.selectedGroups = [...(defaults.access?.groups ?? [])];

    const semesterCtrl = this.dateFormGroup.get('semester')!;
    this.filteredSemesters$ = semesterCtrl.valueChanges.pipe(
      startWith(semesterCtrl.value ?? ''),
      map(value => this._filterSemesters(value ?? '')),
    );

    this.apiService.getUsersAndGroups().subscribe(result => {
      this.allUsers = result.users.map(u => u.sub);
      this.allGroups = result.groups.map(g => g.name);

      this.filteredUsers$ = this.userInputCtrl.valueChanges.pipe(
        startWith(''),
        map(value =>
          this._filterList(value ?? '', this.allUsers, this.selectedUsers),
        ),
      );

      this.filteredGroups$ = this.groupInputCtrl.valueChanges.pipe(
        startWith(''),
        map(value =>
          this._filterList(value ?? '', this.allGroups, this.selectedGroups),
        ),
      );

      this.isLoading = false;
    });
  }

  get isInvalid(): boolean {
    return (
      this.nameFormGroup?.invalid ||
      this.dateFormGroup?.invalid ||
      this.miscFormGroup?.invalid
    );
  }

  private _filterSemesters(value: string): string[] {
    const lower = value.toLowerCase();
    return this.semesters.filter(s => s.toLowerCase().includes(lower));
  }

  private _filterList(
    value: string,
    all: string[],
    selected: string[],
  ): string[] {
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

  private parseDateString(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  onSave() {
    if (this.isInvalid) return;

    const name = this.nameFormGroup.value;
    const date = this.dateFormGroup.value;
    const misc = this.miscFormGroup.value;

    const result: Exam = Object.assign(new Exam(), this.data.exam ?? {}, {
      courseName: name.courseName,
      examinerName: name.examinerName,
      semester: date.semester,
      date: date.date,
      examLengthMinutes: date.examLengthMinutes,
      bilingual: misc.bilingual,
      conceptPagesManual: misc.conceptPages,
      access: {
        users: this.selectedUsers,
        groups: this.selectedGroups,
      },
    });
    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
