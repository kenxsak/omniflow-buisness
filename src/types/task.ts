
export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string; // ISO string
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  leadId?: string; // Optional link to a Lead
  leadName?: string; // Denormalized for display
  companyId: string; // To scope tasks to a company
  appointmentId?: string; // Optional link to an Appointment
  appointmentTitle?: string; // Denormalized for display
}
