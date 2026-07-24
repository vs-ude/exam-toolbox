import { Injectable } from '@angular/core';

import { Exam, parseExam } from '../types/shared/exam';

// Wraps the exam data with a timestamp
export interface AutosaveWrapper {
  timestamp: number;
  data: Exam;
}

@Injectable({
  providedIn: 'root',
})
export class AutosaveService {
  private readonly STORAGE_PREFIX = 'exam_autosave_';
  private readonly NEW_DRAFT_KEY = 'new_draft'; // Special key for exams without an ID yet (e.g. creating a new exam)

  constructor() {}

  saveLocal(examId: string | undefined, exam: Exam): void {
    // If no ID is provided or ID is 'new' (e.g. creating a new exam), use the special 'new_draft' key.
    const safeId = examId && examId !== 'new' ? examId : this.NEW_DRAFT_KEY;

    const wrapper: AutosaveWrapper = {
      timestamp: Date.now(),
      data: exam,
    };

    try {
      const key = this.getStorageKey(safeId);
      localStorage.setItem(key, JSON.stringify(wrapper));
      // console.debug(`[Autosave] Saved draft for ${safeId} at ${new Date().toISOString()}`);
    } catch (e) {
      console.warn(
        '[Autosave] Failed to write to local storage (Quota exceeded?)',
        e,
      );
    }
  }

  // Retrieves the locally saved exam wrapper.
  loadLocal(examId: string | undefined): AutosaveWrapper | null {
    const safeId = examId && examId !== 'new' ? examId : this.NEW_DRAFT_KEY;
    const key = this.getStorageKey(safeId);

    const item = localStorage.getItem(key);

    if (!item) return null;

    try {
      const parsedItem: AutosaveWrapper = JSON.parse(item);
      parsedItem.data = parseExam(parsedItem.data);
      return parsedItem;
    } catch (e) {
      console.error(
        '[Autosave] Corrupt data found in local storage, clearing it.',
        e,
      );
      this.clearLocal(safeId);
      return null;
    }
  }

  // Clears the local save.
  clearLocal(examId: string | undefined): void {
    const safeId = examId && examId !== 'new' ? examId : this.NEW_DRAFT_KEY;
    const key = this.getStorageKey(safeId);
    localStorage.removeItem(key);
  }

  // Generates the specific key used for local storage.
  private getStorageKey(suffix: string): string {
    return `${this.STORAGE_PREFIX}${suffix}`;
  }
}
