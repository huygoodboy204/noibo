export interface Notification {
  id: string;
  user_id_receiver: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  event_id?: string;
  type: 'event_reminder' | 'event_invitation' | 'event_created' | string;
  remind_time?: string;
} 