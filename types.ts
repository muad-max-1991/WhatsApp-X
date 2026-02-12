export interface GeneratedContact {
  id: string;
  number: string;
  name: string;
  isSaved?: boolean;
}

export interface GenerationConfig {
  pattern: string;
  count: number;
  contactNamePrefix: string;
}

export interface GenerationOptions {
  repetitionDensity: number; // 0.0 to 1.0
}