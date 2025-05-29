-- Add event_id column to notifications table
ALTER TABLE notifications
ADD COLUMN event_id uuid REFERENCES company_events(id);
 
-- Add index for better query performance
CREATE INDEX idx_notifications_event_id ON notifications(event_id); 