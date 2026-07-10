export type Language = keyof Translation;
export interface Translation {
  DE: string;
  EN: string;
}

export interface Dimension {
  unit: 'cm' | 'mm' | 'relative';
  dimension: 'width' | 'height';
  scalar: number;
}

export interface Question {
  DE: string;
  EN: string;
}
