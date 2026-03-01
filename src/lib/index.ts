export const ROUTE_PATHS = {
  DASHBOARD: '/',
  AI_ASSISTANT: '/ai',
  CLIENTS: '/clients',
  FINANCES: '/finances',
  TASKS: '/tasks',
  CALENDAR: '/calendar',
  CONTENT: '/content',
  ANALYTICS: '/analytics',
  AUTOMATION: '/automation',
  INTEGRATIONS: '/integrations',
  FILE_VAULT: '/files',
  VOICE: '/voice',
  STRATEGY_CONNECTIONS: '/strategy-connections',
  SETTINGS: '/settings',
} as const;

export type TabId = keyof typeof ROUTE_PATHS;

export type ClientStatus = 'active' | 'inactive' | 'onboarding' | 'pending';

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  status: ClientStatus;
  avatar?: string;
  phone?: string;
  website?: string;
  socials?: string[];
  notes?: string;
  attachments?: { id: string; name: string; url: string; size?: string }[];
  lastContact: string;
  revenue: number;
  tags?: string[];
  billing?: {
    retainer?: {
      amountCents?: number | null;
      cadence?: 'weekly'|'biweekly'|'monthly'|'quarterly'|'yearly'|null;
      dayOfMonth?: number | null;
      timeOfDay?: string | null;
      startDate?: string | null;
      nextDueDate?: string | null;
      notes?: string | null;
      sourceMemoId?: string | null;
      updatedAt?: string | null;
    }
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  assignedTo: string;
  createdAt: string;

  /** Extended fields for TRP Workstation v1 */
  type?: 'admin' | 'design' | 'social' | 'website' | 'shoot' | 'edit' | 'event' | 'invoice' | 'photo' | 'video' | 'web' | 'socials' | 'meeting' | 'email';
  /** Optional external tool link for category shortcuts (e.g., Canva, CapCut, Wix) */
  toolLink?: string;
  tags?: string[];
  checklist?: { id: string; text: string; done: boolean }[];
  attachments?: { id: string; name: string; url: string }[];

  /** Daily Top 3 Priorities */
  isTopPriority?: boolean;
  topPriorityRank?: 1 | 2 | 3 | null;
  topPriorityDate?: string; // YYYY-MM-DD (local)
  /** Timing fields */
  completedAt?: string;
  durationMs?: number;
  /** Optional fields added for voice-memo integration */
  dueText?: string;
  sourceMemoId?: string;
  source?: 'voice_memo' | string;
  sourceMemoTitle?: string;
}

export interface ActivityLog {
  id: string;
  clientId?: string;
  clientName?: string;
  type: 'post' | 'outreach' | 'delivery' | 'dropoff' | 'meeting' | 'misc';
  platform?: string;
  notes: string;
  link?: string;
  timestamp: string;
  source?: 'voice_memo' | string;
  sourceMemoId?: string;
  sourceMemoTitle?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partial';
  dueDate: string;
  createdAt: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
  total: number;
  paidAt?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: 'social' | 'blog' | 'video' | 'email' | 'ad';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publishDate: string;
  platforms: string[];
  clientName: string;
  description?: string;
  thumbnail?: string;
}

export interface VoiceRecording {
  id: string;
  title: string;
  duration: string;
  date: string;
  transcript?: string;
  fileUrl: string;
  size: string;
  clientId?: string;
}

export interface DraftEvent {
  id: string;
  clientId?: string;
  title: string;
  whenText?: string;
  date?: string | null;
  context: string;
  sourceMemoId: string;
  status: 'draft' | 'confirmed' | 'dismissed';
  createdAt: string;
}

export interface Integration {
  id: string;
  name: string;
  category: 'social' | 'crm' | 'ads' | 'communication' | 'storage';
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  lastSync?: string;
  description: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  apiKey: string;
  aiModel: string;
  notificationsEnabled: boolean;
  autoTranscribe: boolean;
  // Facebook integration (optional)
  fbWorkerUrl?: string;
  fbPageId?: string;
  fbAccessToken?: string;
  fbUserToken?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  owner: string;
  url: string;
}