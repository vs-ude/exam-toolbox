import { Translation } from './exam';

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
    this.codes = codes ?? { DE: 'R4ND', EN: 'R4ND' };
    this.sequenceNumber = sequenceNumber ?? 4242;
  }
}
