export type JobStatus = 'idle' | 'ready' | 'generating' | 'validating' | 'complete' | 'blocked' | 'failed';

export interface JobMessage {
  status: JobStatus;
  message: string;
  progress?: number;
}