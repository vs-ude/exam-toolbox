import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { truncateString, stripHTML } from '../../services/helpers.service';
import type { EditExamComponent } from './edit-exam.component';

export function onTabChange(this: EditExamComponent, index: number): void {
  this.selectedTabIndex = index;
  if (index < this.exam.tasks.length) {
    this.currentGroupView = index;
  }
}

export function addTab(this: EditExamComponent): void {
  this.exam.tasks.push({
    groupNumber: this.exam.tasks.length + 1,
    groupTitle: { A: '', B: '' },
    tasks: [],
  });
  const newIndex = this.exam.tasks.length - 1;
  // Defer so Angular renders the new mat-tab before [selectedIndex] tries to select it
  setTimeout(() => {
    this.currentGroupView = newIndex;
    this.selectedTabIndex = newIndex;
  });
  this.triggerAutosave();
}

export function deleteTab(this: EditExamComponent, i: number): void {
  if (this.exam.tasks.length === 1) {
    return;
  }
  this.exam.tasks.splice(i, 1);
  this.currentGroupView--;
  this.selectedTabIndex = this.currentGroupView;
  this.triggerAutosave();
}

export function tabLabel(this: EditExamComponent, index: number): string {
  const title = stripHTML(this.exam.tasks[index].groupTitle.A);
  if (title) {
    return truncateString(title, 20);
  } else {
    return 'Assignment ' + (index + 1);
  }
}

export function dropTab(
  this: EditExamComponent,
  event: CdkDragDrop<string[]>,
): void {
  const prevActive = this.exam.tasks[this.currentGroupView];
  moveItemInArray(this.exam.tasks, event.previousIndex, event.currentIndex);
  this.currentGroupView = this.exam.tasks.indexOf(prevActive);
  this.selectedTabIndex = this.currentGroupView;
  this.triggerAutosave();
}
