import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, User, Activity, Search, Filter, 
  ChevronRight, Trash2, CheckCircle2, X, Plus, 
  Edit2, Save, Camera, Award, Clock, BookOpen, 
  Info, Phone, Mail, ShieldCheck, TrendingUp, 
  ArrowUpRight, ArrowDownRight, MoreVertical, 
  Settings, LogOut, LayoutDashboard, Stethoscope, FileText, Star, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Doctor, Appointment, Specialty } from '../types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AdminDashboardProps {
  onDataUpdate?: () => void;
}

export default function AdminDashboard({ onDataUpdate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'doctors' | 'patients' | 'news'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDoctorModal, setShowDoctorModal] = useState<any>(null);
  const [showNewsModal, setShowNewsModal] = useState<any>(null);
  const [showNotesModal, setShowNotesModal] = useState<{ id: number; notes: string; attachment_url?: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newsImagePreview, setNewsImagePreview] = useState('');
  const [doctorPhotoPreview, setDoctorPhotoPreview] = useState('');
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [showSpecialtySuggestions, setShowSpecialtySuggestions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, apts, docs, pts, specs, newsData] = await Promise.all([
        api.admin.getStats().catch(e => {
          console.error('Stats error:', e);
          return { appointments: 0, patients: 0, doctors: 0, completed: 0 };
        }),
        api.admin.getAppointments().catch(e => {
          console.error('Appointments error:', e);
          return [];
        }),
        api.admin.getDoctors().catch(e => {
          console.error('Doctors error:', e);
          return [];
        }),
        api.admin.getPatients().catch(e => {
          console.error('Patients error:', e);
          if (e.response) {
            console.error('Response data:', e.response.data);
            console.error('Response status:', e.response.status);
          }
          toast.error('Ошибка загрузки списка пациентов');
          return [];
        }),
        api.getSpecialties().catch(e => {
          console.error('Specialties error:', e);
          return [];
        }),
        api.getNews().catch(e => {
          console.error('News error:', e);
          return [];
        })
      ]);
      setStats(s);
      setAppointments(apts);
      setDoctors(docs);
      setPatients(pts);
      setSpecialties(specs);
      setNews(newsData);
    } catch (e) {
      console.error('Failed to load admin data', e);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(doc => 
    (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.specialty || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter(pt => 
    (pt.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pt.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pt.phone || '').includes(searchQuery)
  );

  const [statusFilter, setStatusFilter] = useState<string>('Все статусы');

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = searchQuery === '' || 
      (apt.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'Все статусы' || 
      (statusFilter === 'Предстоит' && apt.status === 'scheduled') ||
      (statusFilter === 'Завершено' && apt.status === 'completed') ||
      (statusFilter === 'Отменено' && apt.status === 'cancelled');

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.admin.updateAppointmentStatus(id, status);
      loadData();
      toast.success('Статус обновлен');
    } catch (e) {
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;
    try {
      await api.admin.deleteAppointment(id);
      loadData();
      toast.success('Запись удалена');
    } catch (e) {
      toast.error('Ошибка удаления');
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      specialtyName: specialtyInput,
      photo: formData.get('photo'),
      experience: parseInt(formData.get('experience') as string),
      education: formData.get('education'),
      bio: formData.get('bio')
    };

    try {
      if (showDoctorModal.id) {
        await api.admin.updateDoctor(showDoctorModal.id, data);
        toast.success('Профиль врача обновлен');
      } else {
        await api.admin.createDoctor(data);
        toast.success('Врач успешно добавлен');
      }
      setShowDoctorModal(null);
      loadData();
      onDataUpdate?.();
    } catch (e) {
      toast.error('Ошибка сохранения');
    }
  };

  const handleDeleteDoctor = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого врача?')) return;
    try {
      await api.admin.deleteDoctor(id);
      loadData();
      onDataUpdate?.();
      toast.success('Врач удален');
    } catch (e) {
      toast.error('Ошибка удаления');
    }
  };

  const handleDeletePatient = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пациента и все его записи?')) return;
    try {
      await api.admin.deletePatient(id);
      loadData();
      onDataUpdate?.();
      toast.success('Пациент удален');
    } catch (e) {
      toast.error('Ошибка удаления');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !showNotesModal) return;
    
    setUploadingFile(true);
    try {
      const { url } = await api.admin.uploadAttachment(showNotesModal.id, e.target.files[0]);
      setShowNotesModal({ ...showNotesModal, attachment_url: url });
      toast.success('Файл загружен');
    } catch (e) {
      toast.error('Ошибка загрузки файла. Разрешены только PDF.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      title: formData.get('title'),
      content: formData.get('content'),
      image: formData.get('image')
    };

    try {
      if (showNewsModal.id) {
        await api.admin.updateNews(showNewsModal.id, data);
        toast.success('Новость обновлена');
      } else {
        await api.admin.createNews(data);
        toast.success('Новость опубликована');
      }
      setShowNewsModal(null);
      loadData();
      onDataUpdate?.();
    } catch (e) {
      toast.error('Ошибка сохранения');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          <p className="text-slate-500 font-bold animate-pulse">Загрузка панели управления...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Mobile Toggle or Bottom Nav could be added, for now let's make it fully responsive */}
      <div className="w-80 bg-slate-950 text-white p-8 flex flex-col hidden lg:flex shrink-0">
        <div className="flex items-center gap-4 mb-16">
          <div className="p-3 bg-teal-500 rounded-2xl shadow-lg shadow-teal-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">ГБУЗ РТ "Дзун-Хемчикский ММЦ"</h1>
            <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Панель управления</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
            { id: 'appointments', label: 'Записи', icon: Calendar },
            { id: 'doctors', label: 'Врачи', icon: Stethoscope },
            { id: 'patients', label: 'Пациенты', icon: Users },
            { id: 'news', label: 'Новости', icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center font-black">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Администратор</p>
              <p className="text-[10px] text-slate-500 truncate">admin@med.ru</p>
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('med_user');
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-100 p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-30 gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'overview' && 'Обзор системы'}
              {activeTab === 'appointments' && 'Управление записями'}
              {activeTab === 'doctors' && 'База врачей'}
              {activeTab === 'patients' && 'Список пациентов'}
              {activeTab === 'news' && 'Новости'}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 font-medium">Добро пожаловать в панель управления</p>
          </div>

          <div className="flex items-center gap-3 md:gap-6 overflow-x-auto pb-2 md:pb-0 lg:hidden no-scrollbar">
            {[
              { id: 'overview', icon: LayoutDashboard },
              { id: 'appointments', icon: Calendar },
              { id: 'doctors', icon: Stethoscope },
              { id: 'patients', icon: Users },
              { id: 'news', icon: FileText },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`p-3 rounded-xl shrink-0 transition-all ${
                  activeTab === item.id ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </header>

        <main className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                  {[
                    { label: 'Всего записей', value: stats?.appointments || 0, icon: Calendar, color: 'teal', trend: '+12%', bg: 'bg-teal-50', text: 'text-teal-600' },
                    { label: 'Пациентов', value: stats?.patients || 0, icon: Users, color: 'blue', trend: '+5%', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Врачей', value: stats?.doctors || 0, icon: Stethoscope, color: 'indigo', trend: '0%', bg: 'bg-indigo-50', text: 'text-indigo-600' },
                    { label: 'Завершено', value: stats?.completed || 0, icon: CheckCircle2, color: 'emerald', trend: '+18%', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex items-start justify-between mb-4 md:mb-6">
                        <div className={`p-3 md:p-4 ${stat.bg} rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform`}>
                          <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.text}`} />
                        </div>
                        <div className="flex items-center gap-1 text-emerald-500 text-[10px] md:text-xs font-black">
                          <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                          {stat.trend}
                        </div>
                      </div>
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Recent Appointments */}
                  <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Последние записи</h3>
                      <button 
                        onClick={() => setActiveTab('appointments')}
                        className="text-teal-600 font-bold text-sm hover:underline"
                      >
                        Смотреть все
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Пациент</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Врач</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Статус</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {appointments.slice(0, 5).map((apt) => (
                            <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center font-black text-teal-600">
                                    {apt.patientName[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{apt.patientName}</p>
                                    <p className="text-xs text-slate-400">{apt.patientPhone}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <p className="font-bold text-slate-900">{apt.doctorName}</p>
                                <p className="text-xs text-teal-600 font-bold uppercase tracking-tighter">{apt.specialty}</p>
                              </td>
                              <td className="px-8 py-6">
                                <select 
                                  value={apt.status}
                                  onChange={(e) => handleUpdateStatus(apt.id, e.target.value)}
                                  className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border-none outline-none cursor-pointer ${
                                    apt.status === 'scheduled' ? 'bg-blue-50 text-blue-600' : 
                                    apt.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                                    'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  <option value="scheduled">Предстоит</option>
                                  <option value="completed">Завершено</option>
                                  <option value="cancelled">Отменено</option>
                                </select>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => setShowNotesModal({ id: apt.id, notes: apt.notes || '', attachment_url: apt.attachment_url })}
                                    className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                                    title="Заметки"
                                  >
                                    <FileText className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => setActiveTab('appointments')}
                                    className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                                    title="Перейти к записи"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sidebar Stats */}
                  <div className="space-y-8">
                    <div className="bg-slate-950 rounded-[3rem] shadow-2xl p-10 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                        <Sparkles className="w-48 h-48" />
                      </div>
                      <h3 className="text-2xl font-black mb-8 tracking-tight relative z-10">Статистика клиники</h3>
                      <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Записей за месяц</p>
                            <p className="text-2xl font-black text-teal-400">{stats?.monthly || 0}</p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Рейтинг</p>
                            <p className="text-2xl font-black text-amber-400">{stats?.avgRating || '5.0'}</p>
                          </div>
                        </div>

                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mb-4">Топ направлений</p>
                          <div className="space-y-3">
                            {stats?.topSpecialties?.map((s: any, i: number) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300">{s.name}</span>
                                <span className="text-xs font-black text-teal-400">{s.count}</span>
                              </div>
                            ))}
                            {(!stats?.topSpecialties || stats.topSpecialties.length === 0) && (
                              <p className="text-xs text-slate-600">Нет данных</p>
                            )}
                          </div>
                        </div>

                        <div className="p-8 bg-teal-500 rounded-[2rem] text-center shadow-xl shadow-teal-900/20">
                          <p className="text-xs font-black uppercase tracking-widest mb-2 text-teal-950/60 text-center">Отменяемость</p>
                          <p className="text-4xl font-black tracking-tight text-teal-950 text-center">
                            {stats?.appointments > 0 ? Math.round((stats.cancelled / stats.appointments) * 100) : 0}%
                          </p>
                          <p className="text-[10px] font-bold text-teal-950/40 mt-1">от общего числа записей</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
                      <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Быстрые действия</h3>
                      <div className="space-y-4">
                        <button onClick={() => setShowDoctorModal({ id: null })} className="w-full p-4 bg-slate-50 hover:bg-teal-50 text-slate-900 rounded-2xl font-bold flex items-center gap-4 transition-all group">
                          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-teal-600">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          Добавить врача
                        </button>
                        <button onClick={() => setShowNewsModal({ id: null })} className="w-full p-4 bg-slate-50 hover:bg-blue-50 text-slate-900 rounded-2xl font-bold flex items-center gap-4 transition-all group">
                          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-blue-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          Опубликовать новость
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'appointments' && (
              <motion.div
                key="appointments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 rounded-xl md:rounded-2xl">
                      <Calendar className="w-5 h-5 md:w-6 md:h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Все записи на прием</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Всего: {appointments.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-auto">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-12 pr-8 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer"
                      >
                        <option>Все статусы</option>
                        <option>Предстоит</option>
                        <option>Завершено</option>
                        <option>Отменено</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Пациент</th>
                        <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Врач</th>
                        <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата и Время</th>
                        <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Статус</th>
                        <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 md:px-8 py-6">
                            <div className="font-bold text-slate-900 text-sm md:text-base">{apt.patientName}</div>
                            <div className="text-[10px] md:text-xs text-slate-400 truncate max-w-[150px]">{apt.patientEmail}</div>
                            <div className="text-[9px] md:text-[10px] text-teal-600 font-bold">{apt.patientPhone}</div>
                          </td>
                          <td className="px-4 md:px-8 py-6">
                            <div className="font-bold text-slate-900 text-sm md:text-base">{apt.doctorName}</div>
                            <div className="text-[9px] md:text-[10px] text-teal-600 font-bold uppercase tracking-tighter">{apt.specialty}</div>
                          </td>
                          <td className="px-4 md:px-8 py-6">
                            <div className="font-bold text-slate-900 text-sm md:text-base">
                              {(() => {
                                try {
                                  const datePart = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
                                  return format(parseISO(datePart), 'd MMM yy', { locale: ru });
                                } catch (e) {
                                  return apt.date;
                                }
                              })()}
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-400 font-bold">{apt.time.slice(0, 5)}</div>
                          </td>
                          <td className="px-4 md:px-8 py-6">
                            <select 
                              value={apt.status}
                              onChange={(e) => handleUpdateStatus(apt.id, e.target.value)}
                              className={`text-[8px] md:text-[10px] px-2 md:px-3 py-1 md:py-1.5 rounded-full font-black uppercase tracking-widest border-none outline-none cursor-pointer ${
                                apt.status === 'scheduled' ? 'bg-blue-50 text-blue-600' : 
                                apt.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                                'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              <option value="scheduled">Предстоит</option>
                              <option value="completed">Завершено</option>
                              <option value="cancelled">Отменено</option>
                            </select>
                          </td>
                          <td className="px-4 md:px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-1 md:gap-2">
                              {apt.status === 'scheduled' && (
                                <button 
                                  onClick={() => setShowNotesModal({ id: apt.id, notes: apt.notes || '', attachment_url: apt.attachment_url })}
                                  className="p-2 md:p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Завершить и добавить заметки"
                                >
                                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              )}
                              {apt.status === 'completed' && (
                                <button 
                                  onClick={() => setShowNotesModal({ id: apt.id, notes: apt.notes || '', attachment_url: apt.attachment_url })}
                                  className="p-2 md:p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="Редактировать заметки"
                                >
                                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteAppointment(apt.id)}
                                className="p-2 md:p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'doctors' && (
              <motion.div
                key="doctors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 rounded-2xl">
                      <Stethoscope className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Управление врачами</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Всего специалистов: {doctors.length}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowDoctorModal({});
                      setSpecialtyInput('');
                      setDoctorPhotoPreview('');
                    }}
                    className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 flex items-center gap-3"
                  >
                    <Plus className="w-5 h-5" />
                    Добавить врача
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredDoctors.map((doc) => (
                    <motion.div 
                      key={doc.id}
                      whileHover={{ y: -10 }}
                      className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={doc.photo} 
                          alt={doc.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                          <div>
                            <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest mb-1">{doc.specialtyName}</p>
                            <h4 className="text-white font-black text-xl tracking-tight">{doc.name}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-slate-500 font-bold">
                            <Clock className="w-4 h-4 text-teal-500" />
                            Опыт: {doc.experience} лет
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 font-black">
                            <Award className="w-4 h-4" />
                            {doc.rating || '5.0'}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              setShowDoctorModal(doc);
                              setSpecialtyInput(doc.specialtyName);
                              setDoctorPhotoPreview(doc.photo || '');
                            }}
                            className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs hover:bg-teal-50 hover:text-teal-600 transition-all flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Изменить
                          </button>
                          <button 
                            onClick={() => handleDeleteDoctor(doc.id)}
                            className="p-4 bg-slate-50 text-slate-300 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'patients' && (
              <motion.div
                key="patients"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 rounded-2xl">
                      <Users className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">База пациентов</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Зарегистрировано: {patients.length}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Имя</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Контакты</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата регистрации</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(patients || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="p-6 bg-slate-50 rounded-full">
                                <User className="w-12 h-12 text-slate-200" />
                              </div>
                              <p className="text-slate-400 font-bold text-xl">Пациенты не найдены</p>
                              <p className="text-slate-400 text-sm">Данные загружаются или список пуст</p>
                            </div>
                          </td>
                        </tr>
                      ) : (filteredPatients || []).map((pt) => (
                        <tr key={pt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">
                                {pt.name ? pt.name[0] : '?'}
                              </div>
                              <div className="font-black text-slate-900 text-lg">{pt.name || 'Без имени'}</div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-slate-600 mb-1">
                              <Mail className="w-4 h-4 text-teal-500" />
                              <span className="font-bold">{pt.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-4 h-4 text-teal-500" />
                              <span className="font-bold">{pt.phone}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-900">
                              {format(parseISO(pt.created_at), 'd MMMM yyyy', { locale: ru })}
                            </div>
                            <div className="text-xs text-slate-400">ID: {pt.id}</div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeletePatient(pt.id)}
                              className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Удалить пациента"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'news' && (
              <motion.div
                key="news"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 rounded-2xl">
                      <FileText className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Управление новостями</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Всего новостей: {news.length}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowNewsModal({});
                      setNewsImagePreview('');
                    }}
                    className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 flex items-center gap-3"
                  >
                    <Plus className="w-5 h-5" />
                    Добавить новость
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {news.map((item) => (
                    <div key={item.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      {item.image && (
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={item.image} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="p-8 flex-1 flex flex-col">
                        <h4 className="text-xl font-black text-slate-900 mb-2">{item.title}</h4>
                        <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1">{item.content}</p>
                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                          <span className="text-xs text-slate-400 font-bold">
                            {format(parseISO(item.created_at), 'd MMMM yyyy', { locale: ru })}
                          </span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setShowNewsModal(item);
                                setNewsImagePreview(item.image || '');
                              }}
                              className="p-3 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (!window.confirm('Удалить новость?')) return;
                                try {
                                  await api.admin.deleteNews(item.id);
                                  loadData();
                                  toast.success('Новость удалена');
                                } catch (e) {
                                  toast.error('Ошибка удаления');
                                }
                              }}
                              className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Doctor Modal */}
      <AnimatePresence>
        {showDoctorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDoctorModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <form onSubmit={handleSaveDoctor} className="p-10 md:p-16">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
                      {showDoctorModal.id ? 'Редактирование' : 'Новый специалист'}
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Данные врача</h2>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowDoctorModal(null)}
                    className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ФИО Врача</label>
                    <input 
                      name="name"
                      defaultValue={showDoctorModal.name}
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Специализация</label>
                    <input 
                      value={specialtyInput}
                      onChange={(e) => {
                        setSpecialtyInput(e.target.value);
                        setShowSpecialtySuggestions(true);
                      }}
                      onFocus={() => setShowSpecialtySuggestions(true)}
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="Напр: Кардиолог"
                    />
                    <AnimatePresence>
                      {showSpecialtySuggestions && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {specialties
                            .filter(s => s.name.toLowerCase().includes(specialtyInput.toLowerCase()))
                            .map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSpecialtyInput(s.name);
                                  setShowSpecialtySuggestions(false);
                                }}
                                className="w-full px-6 py-3 text-left hover:bg-slate-50 font-bold text-slate-700 transition-colors"
                              >
                                {s.name}
                              </button>
                            ))}
                          {specialtyInput && !specialties.some(s => s.name.toLowerCase() === specialtyInput.toLowerCase()) && (
                            <div className="px-6 py-3 text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50">
                              Новая специализация
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Фото (URL)</label>
                    <input 
                      name="photo"
                      defaultValue={showDoctorModal.photo}
                      onChange={(e) => setDoctorPhotoPreview(e.target.value)}
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="https://images.unsplash.com/..."
                    />
                    {doctorPhotoPreview && (
                      <div className="mt-4 relative rounded-2xl overflow-hidden h-40 border border-slate-100 shadow-inner bg-slate-50">
                        <img 
                          src={doctorPhotoPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL';
                          }}
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md text-[8px] font-black text-white rounded-md uppercase tracking-widest">
                          Предпросмотр
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Опыт (лет)</label>
                    <input 
                      name="experience"
                      type="number"
                      defaultValue={showDoctorModal.experience}
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-8 mb-12">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Образование</label>
                    <textarea 
                      name="education"
                      defaultValue={showDoctorModal.education}
                      required
                      rows={2}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                      placeholder="Медицинский Университет..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Биография / Описание</label>
                    <textarea 
                      name="bio"
                      defaultValue={showDoctorModal.bio}
                      required
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                      placeholder="Краткая информация о враче..."
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 py-6 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-teal-100"
                  >
                    <Save className="w-5 h-5" />
                    Сохранить изменения
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowDoctorModal(null)}
                    className="px-10 py-6 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Modal */}
      <AnimatePresence>
        {showNotesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotesModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="p-10 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Заметки врача</h3>
                  <button 
                    onClick={() => setShowNotesModal(null)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Медицинское заключение / Рекомендации</label>
                    <textarea 
                      value={showNotesModal.notes}
                      onChange={(e) => setShowNotesModal({ ...showNotesModal, notes: e.target.value })}
                      placeholder="Введите рекомендации для пациента..."
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500/20 transition-all h-48 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Прикрепить скан справки (PDF)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer">
                        <div className="px-6 py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-teal-50 hover:border-teal-200 transition-all group">
                          {uploadingFile ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent" />
                          ) : showNotesModal.attachment_url ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              <span className="text-sm font-bold text-slate-600">Файл прикреплен</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5 text-slate-400 group-hover:text-teal-600" />
                              <span className="text-sm font-bold text-slate-400 group-hover:text-teal-600">Выбрать PDF файл</span>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                      </label>
                      {showNotesModal.attachment_url && (
                        <button 
                          onClick={() => setShowNotesModal({ ...showNotesModal, attachment_url: undefined })}
                          className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    try {
                      await api.admin.updateAppointmentStatus(
                        showNotesModal.id, 
                        'completed', 
                        showNotesModal.notes,
                        showNotesModal.attachment_url
                      );
                      setShowNotesModal(null);
                      loadData();
                      onDataUpdate?.();
                      toast.success('Заметки сохранены и прием завершен');
                    } catch (e) {
                      toast.error('Ошибка сохранения');
                    }
                  }}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-teal-600 transition-all shadow-xl shadow-slate-200"
                >
                  Сохранить и завершить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* News Modal */}
      <AnimatePresence>
        {showNewsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewsModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <form onSubmit={handleSaveNews} className="p-10 md:p-16">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
                      {showNewsModal.id ? 'Редактирование' : 'Новая публикация'}
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Новость</h2>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowNewsModal(null)}
                    className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8 mb-12">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Заголовок</label>
                    <input 
                      name="title"
                      defaultValue={showNewsModal.title}
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="Введите заголовок..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Изображение (URL)</label>
                    <input 
                      name="image"
                      defaultValue={showNewsModal.image}
                      onChange={(e) => setNewsImagePreview(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      placeholder="https://images.unsplash.com/..."
                    />
                    {newsImagePreview && (
                      <div className="mt-4 relative rounded-2xl overflow-hidden h-40 border border-slate-100 shadow-inner bg-slate-50">
                        <img 
                          src={newsImagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL';
                          }}
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md text-[8px] font-black text-white rounded-md uppercase tracking-widest">
                          Предпросмотр
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Текст новости</label>
                    <textarea 
                      name="content"
                      defaultValue={showNewsModal.content}
                      required
                      rows={5}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                      placeholder="Введите содержание новости..."
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 py-6 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-teal-100"
                  >
                    <Save className="w-5 h-5" />
                    Опубликовать
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowNewsModal(null)}
                    className="px-10 py-6 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
