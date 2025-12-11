export type ActivityType = 
  | 'lead_assigned' 
  | 'lead_created' 
  | 'lead_updated' 
  | 'lead_status_changed' 
  | 'lead_claimed'
  | 'lead_released'
  | 'lead_viewed'
  | 'bulk_assign'
  | 'bulk_delete'
  | 'bulk_update'
  | 'auto_distribute'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'deal_created'
  | 'deal_updated'
  | 'deal_won'
  | 'deal_lost'
  | 'appointment_scheduled'
  | 'appointment_completed'
  | 'appointment_cancelled'
  | 'user_login'
  | 'user_logout'
  | 'user_invited'
  | 'user_removed'
  | 'export_data'
  | 'import_data';

export type EntityType = 'lead' | 'task' | 'deal' | 'appointment' | 'user' | 'company' | 'campaign';

export interface ActivityLog {
  id: string;
  companyId: string;
  type: ActivityType;
  description: string;
  entityId: string;
  entityType: EntityType;
  performedBy: string;
  performedByName?: string;
  targetUserId?: string;
  targetUserName?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
