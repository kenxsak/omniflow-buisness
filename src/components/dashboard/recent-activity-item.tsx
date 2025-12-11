
import { Users, Mail, Bot, Settings, AlertCircle, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ActivityType = 'lead' | 'email' | 'ai' | 'crm' | 'settings' | 'task' | 'other';

export interface RecentActivityItemProps {
  description: string;
  time: string;
  type: ActivityType;
}

const typeIcons: Record<RecentActivityItemProps['type'], LucideIcon> = {
  lead: Users,
  email: Mail,
  ai: Bot,
  crm: Settings, // Using Settings icon as a generic CRM action icon
  settings: Settings,
  task: ClipboardCheck,
  other: AlertCircle,
};

export default function RecentActivityItem({ description, time, type }: RecentActivityItemProps) {
  const Icon = typeIcons[type] || AlertCircle;

  return (
    <li className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">
        <div className="p-2 bg-secondary rounded-full">
          <Icon className="h-4 w-4 text-secondary-foreground" />
        </div>
      </div>
      <div>
        <p className="text-sm text-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </li>
  );
}
