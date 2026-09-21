export type Language = 'A' | 'B';
export interface Translation {
  A: string;
  B: string;
}

export interface Dimension {
  unit: 'cm' | 'mm' | 'relative';
  dimension: 'width' | 'height';
  scalar: number;
}

export interface Question {
  A: string;
  B: string;
}
