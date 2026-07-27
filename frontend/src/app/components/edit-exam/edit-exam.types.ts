export interface AddTaskDef {
  name: string;
  type: string;
  iconName: string;
  dataCy?: string;
}

export const TASK_DEFS: AddTaskDef[] = [
  {
    name: 'Multiple Choice',
    type: 'multipleChoice',
    iconName: 'multipleChoice.svg',
  },
  {
    name: 'Short Answer',
    type: 'shortAnswer',
    iconName: 'shortAnswer.svg',
    dataCy: 'short-answer',
  },
  { name: 'New Page', type: 'newPage', iconName: 'newPage.svg' },
  { name: 'Picture Task', type: 'pictureTask', iconName: 'pictureTask.svg' },
  { name: 'Latex Task', type: 'latex', iconName: 'latex.svg' },
  { name: 'Table Task', type: 'table', iconName: 'table.svg' },
  { name: 'Manual Text', type: 'manualText', iconName: 'manualText.svg' },
];

export interface PDFTaskInfo {
  page: number;
  logFileBoundaryError: boolean;
}
