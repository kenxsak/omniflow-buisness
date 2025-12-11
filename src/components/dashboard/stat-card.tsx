
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | React.ReactNode;
  change: string;
  icon: LucideIcon;
  period?: string;
  negativeChange?: boolean;
  subtitle?: string;
  actionHint?: string;
  statusColor?: string;
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  period, 
  negativeChange = false,
  subtitle,
  actionHint,
  statusColor
}: StatCardProps) {
  const ChangeIcon = negativeChange ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
          )}
        </div>
        <Icon className={cn("h-5 w-5", statusColor || "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-1 flex-wrap">
            {change && (
              <p className={cn(
                  "text-xs flex items-center",
                  negativeChange ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"
                )}>
                <ChangeIcon className="h-3 w-3 mr-1" />
                {change}
              </p>
            )}
            {period && <p className="text-xs text-muted-foreground">{period}</p>}
          </div>
          {actionHint && (
            <p className="text-xs text-primary/70 mt-1">
              💡 {actionHint}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
