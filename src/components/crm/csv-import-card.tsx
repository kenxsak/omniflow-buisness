'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, CheckCircle, Loader2, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createLeadAction, validateBulkImportAction } from '@/app/actions/lead-actions';
import { useRouter } from 'next/navigation';

interface CsvImportCardProps {
  companyId: string;
}

export function CsvImportCard({ companyId }: CsvImportCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        'Name': 'John Doe',
        'Email': 'john@example.com',
        'Phone': '+1234567890',
        'Company': 'Example Corp',
        'Status': 'New'
      },
      {
        'Name': 'Jane Smith',
        'Email': 'jane@example.com',
        'Phone': '+1987654321',
        'Company': 'Sample Inc',
        'Status': 'Qualified'
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts Template");
    XLSX.writeFile(workbook, "OmniFlow_CRM_Contacts_Template.xlsx");
    toast({ 
      title: "Template Downloaded", 
      description: "Fill in the template with your contacts and upload it back",
      duration: 3000
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const data = e.target?.result;
      let addedCount = 0;
      let skippedCount = 0;
      
      if (data) {
        try {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
          
          // Count valid contacts in the CSV
          const validContacts = jsonData.filter(row => {
            const name = row['Name'] || row['name'] || row['Full Name'];
            const email = row['Email'] || row['email'];
            return name && email;
          });
          
          const contactsToImport = validContacts.length;
          
          // Validate bulk import against contact limits
          const validation = await validateBulkImportAction(companyId, contactsToImport);
          
          if (!validation.canImport) {
            toast({
              title: "🚫 Contact Limit Exceeded",
              description: validation.message || `Cannot import ${contactsToImport} contacts. Please upgrade your plan.`,
              variant: "destructive",
              duration: 8000
            });
            setIsUploading(false);
            if (event.target) event.target.value = '';
            return;
          }
          
          // Proceed with import if validation passed
          for (const row of jsonData) {
            const name = row['Name'] || row['name'] || row['Full Name'];
            const email = row['Email'] || row['email'];
            const phone = row['Phone'] || row['phone'] || row['Mobile'];
            const company = row['Company'] || row['company'];
            const status = row['Status'] || row['status'] || 'New';
            
            if (name && email) {
              try {
                await createLeadAction(companyId, {
                  name: String(name).trim(),
                  email: String(email).toLowerCase().trim(),
                  phone: phone ? String(phone).trim() : undefined,
                  status: status as any,
                  source: 'CSV Import',
                  notes: company ? `Company: ${company}` : undefined,
                });
                addedCount++;
              } catch (error: any) {
                console.error('Error adding lead:', error);
                // If individual contact fails due to limit (shouldn't happen after validation but safety check)
                if (error?.message?.includes('limit reached')) {
                  toast({
                    title: "Contact Limit Reached",
                    description: `Imported ${addedCount} contacts before hitting limit. ${jsonData.length - addedCount} contacts not imported.`,
                    variant: "destructive",
                    duration: 8000
                  });
                  break; // Stop importing
                }
                skippedCount++;
              }
            } else {
              skippedCount++;
            }
          }
          
          toast({ 
            title: "✅ Import Complete!", 
            description: `${addedCount} contacts added to your CRM. ${skippedCount} rows skipped.`,
            duration: 5000
          });
          
          router.refresh();
        } catch (error) {
          console.error("Error processing file:", error);
          toast({ 
            title: "Upload Failed", 
            description: "Error processing file. Make sure it's a valid Excel or CSV file.", 
            variant: "destructive" 
          });
        }
      }
      
      setIsUploading(false);
      if (event.target) event.target.value = '';
    };
    
    reader.readAsBinaryString(file);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Import Contacts from CSV/Excel</CardTitle>
            <CardDescription className="text-base">
              Bulk upload your contacts in 2 easy steps
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <strong>New to CSV import?</strong> Download the template below to see the correct format. Fill it with your contacts (Name, Email, Phone, Company, Status), then upload it back.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              Download Template
            </p>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Excel Template
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              Upload Your File
            </p>
            <Button 
              size="lg" 
              onClick={() => document.getElementById('csv-upload-hub-input')?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Import CSV/Excel
                </>
              )}
            </Button>
            <input 
              type="file" 
              id="csv-upload-hub-input" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Supported formats: CSV (.csv), Excel (.xlsx, .xls) • Required fields: Name, Email • Optional: Phone, Company, Status
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
