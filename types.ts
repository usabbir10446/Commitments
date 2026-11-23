
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

export enum UserRole {
  ADMIN = 'admin',
  VIEWER = 'viewer'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
}

export enum Tab {
  TASKS = 'tasks',
  UPCOMING = 'upcoming',
  WELCOME = 'welcome',
  EMERGENCY = 'emergency',
  SETTINGS = 'settings'
}

export enum TaskStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  COMPLETED = 'completed'
}

export type SignatureMode = 'none' | 'draw' | 'upload' | 'typed';
export type SignatureFontStyle = 'dancing' | 'great-vibes' | 'serif-italic';

export interface ReportSettings {
  commitmentHeading: string;
  signatureEnabled: boolean;
  signatureGreeting: string;
  signatureName: string;
  signatureDesignation: string;
  signatureOrganization: string;
  signatureMode: SignatureMode;
  signatureImageData: string;
  signatureFontStyle: SignatureFontStyle;
  updatedAt?: number;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  commitmentHeading: 'CMT of Respected Comdt',
  signatureEnabled: true,
  signatureGreeting: 'Kind Regards,',
  signatureName: 'Capt Usabbir',
  signatureDesignation: 'GSO-3 (Coord)',
  signatureOrganization: 'BIPSOT',
  signatureMode: 'none',
  signatureImageData: '',
  signatureFontStyle: 'dancing'
};

