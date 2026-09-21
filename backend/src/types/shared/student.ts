import { Translation } from './base.ts';

export class Student {
  name: string;
  matriculation: string;
  codes: Translation;
  sequenceNumber: number;

  constructor(
    name?: string,
    matriculation?: string,
    codes?: Translation,
    sequenceNumber?: number,
  ) {
    this.name = name ?? 'Paula Placeholder';
    this.matriculation = matriculation ?? '1000000';
    this.codes = codes ?? { A: 'R4ND', B: 'R4ND' };
    this.sequenceNumber = sequenceNumber ?? 4242;
  }
}
