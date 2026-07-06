import { TestBed } from '@angular/core/testing';

import { AutosafeService } from './autosafe.service';

describe('AutosafeService', () => {
  let service: AutosafeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutosafeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
