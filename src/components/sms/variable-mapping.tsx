"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { parseTemplateVariables, replaceTemplateVariables, getValueFromContact, type TemplateVariable } from '@/lib/sms-templates-sync';
import type { SMSTemplate } from '@/lib/sms-templates-sync';

export interface VariableMapping {
  position: number;
  placeholder: string;
  mappingType: 'field' | 'static';
  fieldMapping?: string;
  staticValue?: string;
}

interface VariableMappingProps {
  template: SMSTemplate | null;
  provider: 'msg91' | 'fast2sms' | 'twilio';
  contacts?: { name?: string; phone?: string; email?: string; [key: string]: any }[];
  onMappingsChange: (mappings: VariableMapping[]) => void;
}

const DEFAULT_CONTACT_FIELDS = [
  { value: 'contact.name', label: 'Contact Name' },
  { value: 'contact.phone', label: 'Phone Number' },
  { value: 'contact.email', label: 'Email Address' },
];

export function VariableMapping({ template, provider, contacts = [], onMappingsChange }: VariableMappingProps) {
  const [mappings, setMappings] = useState<VariableMapping[]>([]);

  // Dynamically detect available contact fields from loaded contacts
  const availableContactFields = useMemo(() => {
    const fields = [...DEFAULT_CONTACT_FIELDS];
    
    // Add custom fields found in contacts
    if (contacts.length > 0) {
      const firstContact = contacts[0];
      const customFieldKeys = Object.keys(firstContact).filter(
        key => !['name', 'phone', 'email', 'phoneNumber', 'id', 'createdAt', 'updatedAt', 'listId', 'companyId'].includes(key)
      );
      
      customFieldKeys.forEach(key => {
        const fieldValue = firstContact[key];
        // Only add if it's a simple value (string, number)
        if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
          fields.push({
            value: `contact.${key}`,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
          });
        }
      });
    }
    
    return fields;
  }, [contacts]);

  const parsedVariables = useMemo(() => {
    if (!template?.text) return { count: 0, positions: [] };
    return parseTemplateVariables(template.text, provider);
  }, [template?.text, provider]);

  useEffect(() => {
    if (parsedVariables.count > 0) {
      const initialMappings: VariableMapping[] = parsedVariables.positions.map((pos, index) => ({
        position: index + 1,
        placeholder: pos.placeholder,
        mappingType: index === 0 ? 'field' : 'static',
        fieldMapping: index === 0 ? 'contact.name' : undefined,
        staticValue: undefined,
      }));
      setMappings(initialMappings);
      onMappingsChange(initialMappings);
    } else {
      setMappings([]);
      onMappingsChange([]);
    }
  }, [parsedVariables, onMappingsChange]);

  const handleMappingTypeChange = (index: number, type: 'field' | 'static') => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      mappingType: type,
      fieldMapping: type === 'field' ? 'contact.name' : undefined,
      staticValue: type === 'static' ? '' : undefined,
    };
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const handleFieldMappingChange = (index: number, fieldMapping: string) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      fieldMapping,
    };
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const handleStaticValueChange = (index: number, staticValue: string) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      staticValue,
    };
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const previewMessage = useMemo(() => {
    if (!template?.text || mappings.length === 0) return template?.text || '';
    
    const sampleContact = contacts[0] || { name: 'John Doe', phone: '+919876543210', email: 'john@example.com' };
    
    const values = mappings.map(mapping => {
      if (mapping.mappingType === 'static') {
        return mapping.staticValue || '[value]';
      }
      return getValueFromContact(sampleContact, mapping.fieldMapping, '[value]');
    });
    
    return replaceTemplateVariables(template.text, provider, values);
  }, [template?.text, mappings, contacts, provider]);

  const highlightedTemplate = useMemo(() => {
    if (!template?.text) return null;
    
    let result = template.text;
    const pattern = provider === 'msg91' ? /##[^#]+##/g : /\{#[^}]+#\}/g;
    
    result = result.replace(pattern, (match) => {
      return `<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">${match}</span>`;
    });
    
    return result;
  }, [template?.text, provider]);

  if (!template) {
    return null;
  }

  if (parsedVariables.count === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            This template has no variables to map. The message will be sent as-is to all recipients.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Variable Mapping
            <Badge variant="secondary" className="text-xs">
              {parsedVariables.count} variable{parsedVariables.count > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <CardDescription>
            Map each variable to a contact field or enter a static value
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mappings.map((mapping, index) => (
            <div key={index} className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                  {mapping.placeholder}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Variable {index + 1}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Mapping Type</Label>
                  <Select
                    value={mapping.mappingType}
                    onValueChange={(value) => handleMappingTypeChange(index, value as 'field' | 'static')}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field">Contact Field</SelectItem>
                      <SelectItem value="static">Static Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mapping.mappingType === 'field' ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Select Field</Label>
                    <Select
                      value={mapping.fieldMapping || 'contact.name'}
                      onValueChange={(value) => handleFieldMappingChange(index, value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableContactFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">Enter Value</Label>
                    <Input
                      value={mapping.staticValue || ''}
                      onChange={(e) => handleStaticValueChange(index, e.target.value)}
                      placeholder="Enter value for all recipients"
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Use "Contact Field" to personalize messages for each recipient, 
              or "Static Value" to use the same value for everyone.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-green-900 dark:text-green-100">
            📋 Template Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Original Template:</p>
            <div 
              className="text-sm text-green-800 dark:text-green-200 p-2 bg-white dark:bg-green-950 rounded border border-green-200 dark:border-green-800"
              dangerouslySetInnerHTML={{ __html: highlightedTemplate || '' }}
            />
          </div>
          
          <div>
            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
              Preview ({contacts[0]?.name || 'Sample Contact'}):
            </p>
            <div className="text-sm text-green-800 dark:text-green-200 p-2 bg-white dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
              {previewMessage}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
