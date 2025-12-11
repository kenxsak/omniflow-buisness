"use client";

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, FileSpreadsheet, Info, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importSMSTemplatesFromExcelAction } from '@/app/actions/sms-templates-actions';

interface ImportTemplatesDialogProps {
  idToken: string;
  provider: 'msg91' | 'fast2sms';
  onTemplatesImported: () => void;
  trigger?: React.ReactNode;
}

export function ImportTemplatesDialog({ idToken, provider, onTemplatesImported, trigger }: ImportTemplatesDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setParsedData(null);
    setPreviewCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      setPreviewCount(data.length);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Invalid File',
        description: 'Could not parse the uploaded file. Please ensure it is a valid Excel or CSV file.',
        variant: 'destructive',
      });
      resetState();
    }
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please select a valid file with template data',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const result = await importSMSTemplatesFromExcelAction({
        idToken,
        provider,
        data: parsedData,
      });

      if (result.success) {
        toast({
          title: 'Templates Imported',
          description: `Successfully imported ${result.count} new templates for ${provider.toUpperCase()}`,
        });
        resetState();
        setOpen(false);
        onTemplatesImported();
      } else {
        toast({
          title: 'Import Failed',
          description: result.error || 'Failed to import templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing templates:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import templates',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const providerInfo = provider === 'msg91' ? {
    name: 'MSG91',
    downloadSteps: [
      'Login to MSG91 Dashboard',
      'Go to SMS → OneAPI/Flow section',
      'Click "Download Templates" button',
      'Save the Excel file to your computer',
      'Upload it here'
    ],
    dashboardUrl: 'https://control.msg91.com',
    note: 'MSG91 does not provide an API to fetch templates automatically. Excel import is the recommended method.',
    columns: ['Template Name', 'Flow ID / Template ID', 'DLT Template ID', 'Message', 'Type']
  } : {
    name: 'Fast2SMS',
    downloadSteps: [
      'Login to Fast2SMS Dashboard',
      'Go to DLT Manager section',
      'Export your templates to Excel',
      'Save the file to your computer',
      'Upload it here'
    ],
    dashboardUrl: 'https://www.fast2sms.com/dashboard',
    note: 'You can also use "Sync Templates" button which fetches directly from Fast2SMS API.',
    columns: ['Template Name', 'Template ID', 'DLT Template ID', 'Message', 'Category']
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1.5" />
            Import from Excel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {providerInfo.name} Templates</DialogTitle>
          <DialogDescription>
            Upload an Excel/CSV file exported from {providerInfo.name} to import your approved DLT templates
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="instructions">How to Export</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {provider === 'msg91' && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">Why Excel Import?</AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  {providerInfo.note}
                </AlertDescription>
              </Alert>
            )}

            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <Badge variant="secondary">{previewCount} templates found</Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                  >
                    Choose Different File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">
                    Excel (.xlsx, .xls) or CSV files supported
                  </p>
                </div>
              )}
            </div>

            {parsedData && parsedData.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview (first 3 templates):</p>
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {parsedData.slice(0, 3).map((row, index) => {
                    const templateName = row['Template Name'] || row['template_name'] || row['Name'] || `Template ${index + 1}`;
                    const message = row['Message'] || row['message'] || row['Template Body'] || row['Content'] || '';
                    return (
                      <div key={index} className="p-2 text-sm">
                        <p className="font-medium">{templateName}</p>
                        <p className="text-muted-foreground text-xs truncate">{message.substring(0, 80)}...</p>
                      </div>
                    );
                  })}
                </div>
                {parsedData.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {parsedData.length - 3} more templates
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4 mt-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">How to download templates from {providerInfo.name}:</p>
                <ol className="text-sm space-y-1 list-decimal ml-4">
                  {providerInfo.downloadSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                <a 
                  href={providerInfo.dashboardUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3"
                >
                  Open {providerInfo.name} Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Expected columns in Excel file:</p>
              <div className="flex flex-wrap gap-2">
                {providerInfo.columns.map((col, index) => (
                  <Badge key={index} variant="outline">{col}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Column names are flexible - the system will try to match common variations.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !parsedData || parsedData.length === 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Import {previewCount} Templates
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
