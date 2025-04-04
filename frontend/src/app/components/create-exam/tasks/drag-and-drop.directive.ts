import { Directive, EventEmitter, Host, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appDragAndDrop]',
  standalone: true
})
export class DragAndDropDirective {

   @HostBinding("class.fileover") fileOver = false;
   @Output() fileDropped = new EventEmitter<File>();

  constructor() {}

  @HostListener('dragover', ['$event']) onDragOver(event: DragEvent){
    event.preventDefault();
    event.stopPropagation();
    this.fileOver = true;
  }

  @HostListener("dragleave", ['$event']) onDragLeave(event: DragEvent){
    event.preventDefault();
    event.stopPropagation();
    this.fileOver = false;
  }

 @HostListener('drop', ['$event']) onDrop(event: DragEvent){
    event.preventDefault();
    event.stopPropagation();
    this.fileOver = false;
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    this.fileDropped.emit(file);
  }



}
