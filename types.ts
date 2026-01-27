
export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  timeBlock: string; // "0900-1000 hrs"
  title: string;
  venue: string;
  remarks?: string;
  attended?: string; // Changed to string
}

export interface EmergencyMessage {
  id: string;
  text: string;
  createdAt: number; // timestamp
}

export enum Tab {
  TASKS = 'tasks',
  EMERGENCY = 'emergency'
}

export enum TaskStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  COMPLETED = 'completed'
}
