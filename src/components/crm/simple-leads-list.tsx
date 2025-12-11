"use client";

import type { Lead } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Edit2, Trash2 } from 'lucide-react';

interface SimpleLeadsListProps {
  leads: Lead[];
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onSelect?: (leadId: string) => void;
  selectedIds?: Set<string>;
}

export function SimpleLeadsList({ leads, onEdit, onDelete, onSelect, selectedIds }: SimpleLeadsListProps) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) => (
        <Card key={lead.id} className="relative">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{lead.name || lead.email}</h3>
                <p className="text-sm text-muted-foreground">{lead.attributes?.COMPANY_NAME || 'No company'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={lead.status === 'New' ? 'default' : 'secondary'}>
                  {lead.status}
                </Badge>
                {lead.brevoSyncStatus === 'synced' && (
                  <Badge variant="outline">Synced</Badge>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(lead)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(lead)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
