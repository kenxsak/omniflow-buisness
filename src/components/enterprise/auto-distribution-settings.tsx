"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Shuffle, BarChart3, Zap, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getAutoDistributionConfigAction, 
  saveAutoDistributionConfigAction,
  distributeUnassignedLeadsAction,
  getEligibleRepsAction 
} from '@/app/actions/enterprise-actions';
import type { AutoDistributionConfig } from '@/types/enterprise';
import type { AppUser } from '@/types/saas';

export function AutoDistributionSettings() {
  const [config, setConfig] = useState<AutoDistributionConfig>({
    enabled: false,
    method: 'round_robin',
    eligibleRoles: ['user', 'manager'],
    excludeUserIds: [],
    maxLeadsPerRep: undefined,
    lastAssignedIndex: 0,
  });
  const [eligibleReps, setEligibleReps] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    const [savedConfig, reps] = await Promise.all([
      getAutoDistributionConfigAction(),
      getEligibleRepsAction(),
    ]);
    
    if (savedConfig) {
      setConfig(savedConfig);
    }
    setEligibleReps(reps);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveAutoDistributionConfigAction(config);
    setIsSaving(false);

    if (result.success) {
      toast({
        title: 'Settings Saved',
        description: 'Auto-distribution configuration has been updated',
      });
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleDistributeNow = async () => {
    setIsDistributing(true);
    const result = await distributeUnassignedLeadsAction();
    setIsDistributing(false);

    if (result.success) {
      toast({
        title: 'Distribution Complete',
        description: `${result.summary.assignedCount} leads assigned to ${result.assignedLeads.length > 0 ? 'team members' : 'no one (no unassigned leads found)'}`,
      });
    } else {
      toast({
        title: 'Distribution Failed',
        description: result.errors?.[0] || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const toggleRole = (role: string) => {
    const newRoles = config.eligibleRoles.includes(role)
      ? config.eligibleRoles.filter((r) => r !== role)
      : [...config.eligibleRoles, role];
    setConfig({ ...config, eligibleRoles: newRoles });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shuffle className="h-5 w-5" />
          Auto-Distribution Settings
        </CardTitle>
        <CardDescription>
          Automatically distribute new and unassigned leads fairly among your sales team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Auto-Distribution</Label>
            <p className="text-sm text-muted-foreground">
              Automatically assign unassigned leads to eligible team members
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>

        <div className="space-y-3">
          <Label>Distribution Method</Label>
          <Select
            value={config.method}
            onValueChange={(method: any) => setConfig({ ...config, method })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round_robin">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Round Robin - Equal distribution in order
                </div>
              </SelectItem>
              <SelectItem value="load_balanced">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Load Balanced - Assign to rep with fewest leads
                </div>
              </SelectItem>
              <SelectItem value="random">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Random - Random assignment
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Eligible Roles</Label>
          <div className="flex flex-wrap gap-3">
            {['user', 'manager', 'admin'].map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={config.eligibleRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>

        {config.method === 'load_balanced' && (
          <div className="space-y-3">
            <Label>Maximum Leads Per Rep (Optional)</Label>
            <Input
              type="number"
              placeholder="No limit"
              value={config.maxLeadsPerRep || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxLeadsPerRep: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Stop assigning to a rep once they reach this limit
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Label>Eligible Team Members ({eligibleReps.length})</Label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
            {eligibleReps.length > 0 ? (
              eligibleReps.map((rep) => (
                <Badge key={rep.uid} variant="secondary">
                  {rep.name || rep.email} ({rep.role})
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No eligible team members found. Check role settings above.
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleDistributeNow}
          disabled={!config.enabled || isDistributing}
        >
          {isDistributing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4 mr-2" />
          )}
          Distribute Unassigned Now
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
