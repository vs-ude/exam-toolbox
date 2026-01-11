import { TestBed } from '@angular/core/testing';

import { LatexPreviewsService } from './latex-previews.service';

describe('LatexPreviewsService', () => {
  let service: LatexPreviewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LatexPreviewsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
