import { TestBed } from '@angular/core/testing';

import { ThemeToggleService } from './theme-toggle.service';

describe('ThemeToggleService', () => {
  let service: ThemeToggleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeToggleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
