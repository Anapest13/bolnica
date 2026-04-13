export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  photo: string;
  description: string;
  bio?: string;
  education?: string;
}

export interface Specialty {
  id: number;
  name: string;
}

export interface Appointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  date: string;
  time: string;
  reason?: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  doctorName?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  specialty?: string;
  reviewRating?: number;
  reviewComment?: string;
  attachment_url?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'admin';
}
