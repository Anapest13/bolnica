import axios from 'axios';
import { Doctor, Specialty, Appointment } from '../types';

const API_URL = '/api';

const getAuthHeader = () => {
  try {
    const userStr = localStorage.getItem('med_user');
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
      const user = JSON.parse(userStr);
      if (user && user.id) {
        return { 'X-User-Id': user.id.toString() };
      }
    }
  } catch (e) {
    console.error('Error parsing user from localStorage', e);
  }
  return {};
};

export const api = {
  getDoctors: async (): Promise<Doctor[]> => {
    const res = await axios.get(`${API_URL}/doctors`);
    return res.data;
  },
  getSpecialties: async (): Promise<Specialty[]> => {
    const res = await axios.get(`${API_URL}/specialties`);
    return res.data;
  },
  getAppointments: async (): Promise<Appointment[]> => {
    const res = await axios.get(`${API_URL}/appointments`, { headers: getAuthHeader() });
    return res.data;
  },
  createAppointment: async (doctorId: number, date: string, time: string, reason: string) => {
    const res = await axios.post(`${API_URL}/appointments`, { doctorId, date, time, reason }, { headers: getAuthHeader() });
    return res.data;
  },
  cancelAppointment: async (id: number) => {
    const res = await axios.patch(`${API_URL}/appointments/${id}/cancel`, {}, { headers: getAuthHeader() });
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string, phone: string) => {
    const res = await axios.post(`${API_URL}/auth/register`, { name, email, password, phone });
    return res.data;
  },
  resendVerification: async (email: string) => {
    const res = await axios.post(`${API_URL}/auth/resend-verification`, { email });
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
    return res.data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const res = await axios.post(`${API_URL}/auth/reset-password`, { token, newPassword });
    return res.data;
  },
  admin: {
    getStats: async () => {
      const res = await axios.get(`${API_URL}/admin/stats`, { headers: getAuthHeader() });
      return res.data;
    },
    getAppointments: async () => {
      const res = await axios.get(`${API_URL}/admin/appointments`, { headers: getAuthHeader() });
      return res.data;
    },
    updateAppointmentStatus: async (id: number, status: string, notes?: string, attachment_url?: string) => {
      const res = await axios.patch(`${API_URL}/admin/appointments/${id}/status`, { status, notes, attachment_url }, { headers: getAuthHeader() });
      return res.data;
    },
    uploadAttachment: async (id: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/admin/appointments/${id}/attachment`, formData, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data;
    },
    deleteAppointment: async (id: number) => {
      const res = await axios.delete(`${API_URL}/admin/appointments/${id}`, { headers: getAuthHeader() });
      return res.data;
    },
    getDoctors: async () => {
      const res = await axios.get(`${API_URL}/admin/doctors`, { headers: getAuthHeader() });
      return res.data;
    },
    createDoctor: async (data: any) => {
      const res = await axios.post(`${API_URL}/admin/doctors`, data, { headers: getAuthHeader() });
      return res.data;
    },
    updateDoctor: async (id: number, data: any) => {
      const res = await axios.patch(`${API_URL}/admin/doctors/${id}`, data, { headers: getAuthHeader() });
      return res.data;
    },
    deleteDoctor: async (id: number) => {
      const res = await axios.delete(`${API_URL}/admin/doctors/${id}`, { headers: getAuthHeader() });
      return res.data;
    },
    getPatients: async () => {
      const res = await axios.get(`${API_URL}/admin/patients`, { headers: getAuthHeader() });
      return res.data;
    },
    deletePatient: async (id: number) => {
      const res = await axios.delete(`${API_URL}/admin/patients/${id}`, { headers: getAuthHeader() });
      return res.data;
    },
    createNews: async (data: any) => {
      const res = await axios.post(`${API_URL}/admin/news`, data, { headers: getAuthHeader() });
      return res.data;
    },
    updateNews: async (id: number, data: any) => {
      const res = await axios.patch(`${API_URL}/admin/news/${id}`, data, { headers: getAuthHeader() });
      return res.data;
    },
    deleteNews: async (id: number) => {
      const res = await axios.delete(`${API_URL}/admin/news/${id}`, { headers: getAuthHeader() });
      return res.data;
    }
  },
  updateProfile: async (data: { name: string; phone: string; password?: string }) => {
    const res = await axios.patch(`${API_URL}/profile`, data, { headers: getAuthHeader() });
    return res.data;
  },
  getDoctorReviews: async (doctorId: number) => {
    const res = await axios.get(`${API_URL}/doctors/${doctorId}/reviews`);
    return res.data;
  },
  getBusySlots: async (doctorId: number): Promise<{ date: string; time: string }[]> => {
    const res = await axios.get(`${API_URL}/doctors/${doctorId}/busy-slots`, { headers: getAuthHeader() });
    return res.data;
  },
  getNews: async () => {
    const res = await axios.get(`${API_URL}/news`);
    return res.data;
  },
  createReview: async (data: { doctorId: number; appointmentId: number; rating: number; comment: string }) => {
    const res = await axios.post(`${API_URL}/reviews`, data, { headers: getAuthHeader() });
    return res.data;
  }
};
