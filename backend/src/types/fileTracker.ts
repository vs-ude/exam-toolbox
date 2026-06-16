export interface FileTracker {
  name: string;
  refs: string[];
  timeToLive: number;
}
