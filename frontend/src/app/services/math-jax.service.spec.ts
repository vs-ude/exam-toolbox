import { TestBed } from '@angular/core/testing';

import { MathJaxService } from './math-jax.service';

describe('MathJaxService', () => {
  let service: MathJaxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MathJaxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
