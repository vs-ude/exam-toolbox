import {
  Component,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { PictureTask, Task } from '../../../types/shared/tasks';
import { Language, Translation } from '../../../types/shared/base';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { COMMON_IMPORTS } from '../../common-imports';

import { TASK_COMMON_IMPORTS } from '../task-common-imports';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';
import { DragAndDropDirective } from '../drag-and-drop.directive';

@Component({
  selector: 'app-picture-task',
  imports: [...TASK_COMMON_IMPORTS, ...COMMON_IMPORTS, DragAndDropDirective],
  templateUrl: './picture-task.component.html',
  styleUrls: ['./picture-task.component.scss', '../task.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
})
export class PictureTaskComponent extends BaseTaskComponent {
  constructor(private api: ApiService) {
    super();
  }

  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  public readonly publicPath = environment.publicPath;

  // The task object now uses { A: string, B: string } for its URL properties.
  // We use 'any' casting to modify the nested task structure safely for the refactor.
  public task: PictureTask = {
    type: 'pictureTask',
    question: { A: '', B: '' },
    questionPicture: { url: { A: '', B: '' } },
    solutionPicture: { url: { A: '', B: '' } },
    points: 2,
    tags: [],
    tagIds: [],
    createdBy: 'placeholder',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  };

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as PictureTask;

      // Initial download for existing files
      if (this.task.questionPicture.url.A) {
        this.downloadFile(this.task.questionPicture.url.A, 'A', 'question');
      }
      if (this.task.questionPicture.url.B) {
        this.downloadFile(this.task.questionPicture.url.B, 'B', 'question');
      }
      if (this.task.solutionPicture.url.A) {
        this.downloadFile(this.task.solutionPicture.url.A, 'A', 'solution');
      }
      if (this.task.solutionPicture.url.B) {
        this.downloadFile(this.task.solutionPicture.url.B, 'B', 'solution');
      }
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }

  /**
   * Handles file input change events from the UI.
   * @param event The change event from the file input.
   * @param lang The language identifier ('A' or 'B').
   * @param type The task component type ('question' or 'solution').
   */
  fileBrowseHandler(
    event: Event,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    let input = event.target as HTMLInputElement;
    const file = input.files![0];
    this.handleNewPicture(file, lang, type);
  }

  /**
   * Handles file drop events from the UI.
   * @param file The dropped file.
   * @param lang The language identifier ('A' or 'B').
   * @param type The task component type ('question' or 'solution').
   */
  onFileDropped(file: File, lang: Language, type: 'question' | 'solution') {
    if (!file.type.startsWith('image/')) {
      console.error('The selected file is not an image.');
      return;
    }
    this.handleNewPicture(file, lang, type);
  }

  private handleNewPicture(
    picture: File,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    this.uploadFile(picture, lang, type);
    this.previewPicture(picture, lang, type);
    this.taskChangeEvent.emit(this.task);
  }

  private uploadFile(
    file: File,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    this.api.uploadFile(file).subscribe(
      (response: any) => {
        console.log('File uploaded successfully: ', response.url);
        this.saveBackendURL(response.url, lang, type);
      },
      error => {
        console.error('Error uploading file: ', error);
      },
    );
  }

  private saveBackendURL(
    url: string,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    const urlKey = type === 'question' ? 'questionPicture' : 'solutionPicture';
    // Use 'as any' because TypeScript doesn't know the structure of 'url' on PictureTask
    (this.task[urlKey] as any).url[lang] = url;
    this.taskChangeEvent.emit(this.task);
  }

  private downloadFile(
    url: string,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    this.api.downloadFile(url).subscribe(
      response => {
        const newBlob = new Blob([response], { type: response.type });

        let reader = new FileReader();
        reader.readAsDataURL(newBlob);
        reader.onload = () => {
          const dataUrl = reader.result as string;
          this.setPictureFrontendUrl(dataUrl, lang, type);
        };
      },
      error => {
        console.error('Error downloading file: ', error);
      },
    );
  }

  private previewPicture(
    file: File,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.setPictureFrontendUrl(dataUrl, lang, type);
    };
  }

  private setPictureFrontendUrl(
    url: string,
    lang: Language,
    type: 'question' | 'solution',
  ) {
    const urlKey = type === 'question' ? 'questionPicture' : 'solutionPicture';
    (this.task[urlKey] as any).url[lang] = url;
    this.taskChangeEvent.emit(this.task);
  }

  /**
   * Removes the preview image for a given language and type.
   * @param lang The language identifier ('A' or 'B').
   * @param type The task component type ('question' or 'solution').
   */
  public onRemovePreview(lang: Language, type: 'question' | 'solution') {
    const urlKey = type === 'question' ? 'questionPicture' : 'solutionPicture';
    (this.task[urlKey] as any).url[lang] = '';
    this.taskChangeEvent.emit(this.task);
  }
}
