
export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  timeBlock: string; // "0900-1000 hrs"
  title: string;
  venue: string;
  remarks?: string;
  attended?: string;
}

export interface WelcomeTask {
  id: string;
  topText: string;
  bottomText1: string;
  bottomText2: string;
  bottomText3: string;
  imageData: string; // Base64
  isActive: boolean;
}

export interface EmergencyMessage {
  id: string;
  text: string;
  createdAt: number;
}

export enum Tab {
  TASKS = 'tasks',
  WELCOME = 'welcome',
  EMERGENCY = 'emergency'
}

export enum TaskStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  COMPLETED = 'completed'
}
