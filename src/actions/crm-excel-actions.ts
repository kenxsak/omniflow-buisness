"use server";

export interface ParsedLead {
  name: string;
  email: string;
  phone?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Won';
  source: string;
  assignedTo: string;
  attributes: {
    COMPANY_NAME?: string;
    ROLE?: string;
  };
}

export async function importLeadsFromExcelAction(formData: FormData, defaultAssignedTo: string): Promise<ParsedLead[]> {
  const XLSXModule = await import('xlsx');
  const XLSX = XLSXModule.default || XLSXModule;
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new Error('No file provided');
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

  const leadsFromUpload = jsonData.map(row => ({
    name: row['Name'] || `Contact from Upload`,
    email: row['Email'] || '',
    phone: row['Phone']?.toString() || undefined,
    status: ['New', 'Contacted', 'Qualified', 'Lost', 'Won'].includes(row['Status']) 
      ? row['Status'] as 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Won'
      : 'New' as const,
    source: row['How They Found Us'] || row['Source'] || 'Excel Upload',
    assignedTo: row['Owner'] || row['Assigned To'] || defaultAssignedTo,
    attributes: { 
      COMPANY_NAME: row['Company Name'], 
      ROLE: row['Role'] 
    },
  })).filter(lead => lead.email);

  return leadsFromUpload;
}

export async function exportLeadsToExcelAction(filename: string = 'OmniFlow_Contact_Template.xlsx'): Promise<{ 
  success: boolean; 
  data?: string; 
  filename?: string;
  error?: string;
}> {
  try {
    const XLSX = (await import('xlsx')).default || await import('xlsx');
    
    const templateData = [
      { 
        'Name': 'John Doe', 
        'Email': 'john.doe@example.com', 
        'Phone': '+15551234567', 
        'Status': 'New', 
        'How They Found Us': 'Website', 
        'Owner': 'Jane Smith', 
        'Company Name': 'Acme Corp', 
        'Role': 'Manager' 
      },
      { 
        'Name': 'Jane Smith', 
        'Email': 'jane.smith@example.com', 
        'Phone': '+15559876543', 
        'Status': 'Contacted', 
        'How They Found Us': 'Referral', 
        'Owner': '', 
        'Company Name': 'Beta Inc', 
        'Role': 'Developer' 
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts Template");
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = Buffer.from(excelBuffer).toString('base64');

    return {
      success: true,
      data: base64Data,
      filename
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to generate Excel file'
    };
  }
}
