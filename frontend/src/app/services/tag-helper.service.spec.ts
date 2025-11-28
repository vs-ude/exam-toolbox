import { TestBed } from '@angular/core/testing';

import { TagHelperService } from './tag-helper.service';

describe('TagHelperService', () => {
  let service: TagHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TagHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
