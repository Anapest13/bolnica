import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import DoctorCard from './components/DoctorCard';
import BookingForm from './components/BookingForm';
import AppointmentList from './components/AppointmentList';
import Footer from './components/Footer';
import SymptomAssistant from './components/SymptomAssistant';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import { Bot, Sparkles, AlertCircle, Calendar, Clock, User, LogIn, LogOut, Search, Filter, ChevronRight, Star, Award, Phone, Mail, Lock, CheckCircle2, ShieldCheck, FileText, X } from 'lucide-react';
import OpenAI from 'openai';
import { api } from './services/api';
import { Doctor, Appointment } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'appointments' | 'booking' | 'admin' | 'ai-assistant' | 'profile'>('home');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>(['Все']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Все');
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | null>(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [healthTip, setHealthTip] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorReviews, setDoctorReviews] = useState<any[]>([]);
  const [preSelectedDoctor, setPreSelectedDoctor] = useState<Doctor | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [reminders, setReminders] = useState<Appointment[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [showNewsHistory, setShowNewsHistory] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('med_user');
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      localStorage.removeItem('med_user');
    }
    setIsAuthReady(true);
    loadInitialData();
    loadNews();
    generateHealthTip();

    // Handle reset password token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (window.location.pathname === '/reset-password' && token) {
      setResetToken(token);
      setShowAuthModal('reset-password');
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      api.getDoctorReviews(selectedDoctor.id)
        .then(setDoctorReviews)
        .catch(console.error);
    } else {
      setDoctorReviews([]);
    }
  }, [selectedDoctor]);

  const loadNews = async () => {
    try {
      const data = await api.getNews();
      setNews(data);
    } catch (e) {
      console.error('Failed to load news', e);
    }
  };

  const generateHealthTip = async () => {
    try {
      // Check cache first
      const cachedTip = localStorage.getItem('med_health_tip');
      const cachedTime = localStorage.getItem('med_health_tip_time');
      const now = Date.now();
      
      // Cache for 12 hours (43200000 ms)
      if (cachedTip && cachedTime && (now - parseInt(cachedTime) < 43200000)) {
        setHealthTip(cachedTip);
        return;
      }

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        setHealthTip('Пейте больше воды и будьте здоровы!');
        return;
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true
      });

      const response = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Ты - ИИ-помощник ГБУЗ РТ "Дзун-Хемчикский ММЦ". Твоя задача - давать короткие и полезные советы по здоровью.' },
          { role: 'user', content: 'Дай один короткий и полезный совет по здоровью на сегодня (на русском языке). Максимум 2 предложения.' }
        ],
        max_tokens: 150,
      });
      
      const tip = response.choices[0]?.message?.content || 'Пейте больше воды и будьте здоровы!';
      setHealthTip(tip);
      
      // Save to cache
      localStorage.setItem('med_health_tip', tip);
      localStorage.setItem('med_health_tip_time', now.toString());
    } catch (e) {
      setHealthTip('Пейте больше воды и будьте здоровы!');
    }
  };

  const loadInitialData = async () => {
    try {
      const [docs, specs] = await Promise.all([api.getDoctors(), api.getSpecialties()]);
      setDoctors(docs);
      setSpecialties(['Все', ...specs.map(s => s.name)]);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  useEffect(() => {
    if (user && isAuthReady) {
      loadAppointments();
    } else {
      setAppointments([]);
    }
  }, [user, isAuthReady]);

  useEffect(() => {
    if (appointments.length > 0) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const upcoming = appointments.filter(apt => {
        try {
          const datePart = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
          const aptDate = new Date(`${datePart}T${apt.time}`);
          return apt.status === 'scheduled' && aptDate > now && aptDate < tomorrow;
        } catch (e) {
          return false;
        }
      });
      setReminders(upcoming);
    } else {
      setReminders([]);
    }
  }, [appointments]);

  const loadAppointments = async () => {
    try {
      const apts = await api.getAppointments();
      setAppointments(apts);
    } catch (e) {
      console.error('Failed to load appointments', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!authForm.email || !authForm.password) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    if (!emailRegex.test(authForm.email)) {
      toast.error('Введите корректный email');
      return;
    }
    try {
      const data = await api.login(authForm.email, authForm.password);
      setUser(data.user);
      localStorage.setItem('med_user', JSON.stringify(data.user));
      setShowAuthModal(null);
      toast.success(`Добро пожаловать, ${data.user.name}!`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Неверный email или пароль';
      
      if (error.response?.status === 403) {
        toast.error(errorMessage, {
          action: {
            label: 'Отправить снова',
            onClick: async () => {
              try {
                await api.resendVerification(authForm.email);
                toast.success('Письмо отправлено повторно');
              } catch (e) {
                toast.error('Ошибка при отправке письма');
              }
            }
          }
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!authForm.email) {
      toast.error('Пожалуйста, введите ваш email');
      return;
    }
    if (!emailRegex.test(authForm.email)) {
      toast.error('Введите корректный email');
      return;
    }

    try {
      await api.forgotPassword(authForm.email);
      toast.success('Инструкции по восстановлению пароля отправлены на вашу почту');
      setShowAuthModal('login');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка восстановления пароля');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.password || authForm.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    if (!resetToken) {
      toast.error('Токен восстановления отсутствует');
      return;
    }

    try {
      await api.resetPassword(resetToken, authForm.password);
      toast.success('Пароль успешно изменен. Теперь вы можете войти.');
      setShowAuthModal('login');
      setResetToken(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка сброса пароля');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const nameRegex = /^[а-яА-Яa-zA-Z\s]{2,50}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = authForm.phone.replace(/\D/g, '');

    if (!authForm.name || !authForm.email || !authForm.password || !authForm.phone) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    if (!nameRegex.test(authForm.name)) {
      toast.error('Введите корректное ФИО (только буквы, от 2 символов)');
      return;
    }
    if (!emailRegex.test(authForm.email)) {
      toast.error('Введите корректный email');
      return;
    }
    if (phoneDigits.length < 11) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (authForm.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      await api.register(authForm.name, authForm.email, authForm.password, authForm.phone);
      setShowAuthModal('login');
      toast.success('Регистрация почти завершена! Пожалуйста, проверьте вашу почту для подтверждения email.');
    } catch (error) {
      toast.error('Этот email уже зарегистрирован или произошла ошибка');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('med_user');
    setCurrentPage('home');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    let formatted = '+7';
    if (digits.length > 1) {
      const part1 = digits.slice(1, 4);
      const part2 = digits.slice(4, 7);
      const part3 = digits.slice(7, 9);
      const part4 = digits.slice(9, 11);
      
      if (part1) formatted += ` (${part1}`;
      if (part1.length === 3) formatted += ')';
      if (part2) formatted += ` ${part2}`;
      if (part2.length === 3 && part3) formatted += '-';
      if (part3) formatted += part3;
      if (part3.length === 2 && part4) formatted += '-';
      if (part4) formatted += part4;
    }
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setAuthForm({ ...authForm, phone: formatted });
  };

  const handleAddAppointment = async (apt: any) => {
    if (!user) {
      setShowAuthModal('login');
      return;
    }
    try {
      await api.createAppointment(apt.doctorId, apt.date, apt.time, apt.reason);
      loadAppointments();
      setCurrentPage('appointments');
      toast.success('Запись успешно создана!');
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || 'Ошибка при создании записи';
      toast.error(errorMessage);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите отменить запись?')) return;
    try {
      await api.cancelAppointment(id);
      loadAppointments();
      toast.success('Запись отменена');
    } catch (e) {
      toast.error('Ошибка при отмене записи');
    }
  };

  const handleAddToCalendar = (apt: Appointment) => {
    const datePart = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
    const start = new Date(`${datePart}T${apt.time}`).toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(new Date(`${datePart}T${apt.time}`).getTime() + 30 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '');
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=Прием: ${encodeURIComponent(apt.doctorName)}&dates=${start}/${end}&details=${encodeURIComponent(`Специальность: ${apt.specialty}. Причина: ${apt.reason}`)}&location=${encodeURIComponent('Главный корпус, каб. 302')}`;
    window.open(url, '_blank');
  };

  const handleAISelectDoctor = (doctor: Doctor) => {
    setPreSelectedDoctor(doctor);
    setCurrentPage('booking');
  };

  const nextAppointment = appointments.find(a => a.status === 'scheduled');

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'Все' || doc.specialty.trim() === selectedSpecialty.trim();
    return matchesSearch && matchesSpecialty;
  });

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
        <Header 
          onNavigate={setCurrentPage} 
          currentPage={currentPage} 
          user={user}
          onLogin={() => setShowAuthModal('login')}
          onLogout={handleLogout}
        />

        {reminders.length > 0 && currentPage === 'home' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-b border-amber-100 p-4 relative z-40"
          >
            <div className="container mx-auto px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">
                  Напоминание: у вас {reminders.length} {reminders.length === 1 ? 'запись' : 'записи'} в ближайшие 24 часа!
                </span>
              </div>
              <button 
                onClick={() => setCurrentPage('appointments')}
                className="text-amber-900 font-black text-xs uppercase tracking-widest hover:underline"
              >
                Посмотреть
              </button>
            </div>
          </motion.div>
        )}

        <main>
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12 py-12"
              >
                <div className="container mx-auto px-4 space-y-12">
                  {/* Health Tip Banner */}
                  {healthTip && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950 p-10 rounded-[3.5rem] shadow-3xl text-white flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                        <Sparkles className="w-64 h-64" />
                      </div>
                      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px]" />
                      
                      <div className="p-6 bg-teal-500/20 rounded-[2.5rem] shrink-0 border border-teal-500/20 relative z-10">
                        <Bot className="w-12 h-12 text-teal-400" />
                      </div>
                      <div className="relative z-10 text-center md:text-left space-y-2">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                          <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">Совет дня от ИИ</span>
                          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                        </div>
                        <p className="text-slate-300 text-2xl leading-relaxed font-black tracking-tight italic">"{healthTip}"</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Next Appointment Reminder */}
                  {nextAppointment && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-10 rounded-[3.5rem] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.1)] border border-slate-50 flex flex-col lg:flex-row items-center justify-between gap-10 hover:shadow-[0_60px_150px_-30px_rgba(0,0,0,0.2)] transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
                      <div className="flex items-center gap-8 relative z-10">
                        <div className="p-6 bg-teal-50 rounded-[2.5rem] group-hover:bg-teal-100 transition-colors">
                          <Calendar className="w-10 h-10 text-teal-600" />
                        </div>
                        <div className="text-center lg:text-left space-y-1">
                          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-2">Ваш ближайший визит</p>
                          <h3 className="font-black text-3xl text-slate-900 tracking-tight">{nextAppointment.doctorName}</h3>
                          <div className="flex items-center justify-center lg:justify-start gap-4 mt-3">
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full text-slate-600 font-bold text-sm">
                              <Calendar className="w-4 h-4 text-teal-500" /> 
                              {(() => {
                                try {
                                  const datePart = nextAppointment.date.includes('T') ? nextAppointment.date.split('T')[0] : nextAppointment.date;
                                  return format(parseISO(datePart), 'd MMMM yyyy', { locale: ru });
                                } catch (e) {
                                  return nextAppointment.date;
                                }
                              })()}
                            </div>
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full text-slate-600 font-bold text-sm">
                              <Clock className="w-4 h-4 text-teal-500" /> {nextAppointment.time.slice(0, 5)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCurrentPage('appointments')}
                        className="w-full lg:w-auto px-10 py-6 bg-slate-950 text-white rounded-[2rem] font-black text-lg hover:bg-teal-600 transition-all flex items-center justify-center gap-4 shadow-2xl relative z-10 group"
                      >
                        Управление записью 
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                      </button>
                    </motion.div>
                  )}
                </div>

                <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
                  {[
                    { label: 'Предстоящие приемы', value: appointments.filter(a => a.status === 'scheduled').length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Завершенные визиты', value: appointments.filter(a => a.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Доступные врачи', value: doctors.length, icon: User, color: 'text-teal-600', bg: 'bg-teal-50' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="bg-white p-10 rounded-[3.5rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.05)] border border-slate-50 flex items-center gap-8 group"
                    >
                      <div className={`p-6 ${stat.bg} rounded-[2rem] group-hover:scale-110 transition-transform duration-500`}>
                        <stat.icon className={`w-10 h-10 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Hero 
                  onStartBooking={() => setCurrentPage('booking')} 
                  onStartAI={() => setCurrentPage('ai-assistant')}
                />

                <div className="container mx-auto px-4 text-center pb-12">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage('ai-assistant')}
                    className="group relative inline-flex items-center gap-6 px-12 py-8 bg-white border-2 border-slate-50 rounded-[3rem] font-black text-2xl text-slate-900 hover:border-teal-500 hover:bg-teal-50/30 transition-all shadow-3xl hover:shadow-teal-100"
                  >
                    <div className="p-4 bg-teal-500 text-white rounded-[1.5rem] group-hover:rotate-12 transition-transform shadow-xl shadow-teal-200">
                      <Bot className="w-10 h-10" />
                    </div>
                    Умный подбор врача
                    <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                  </motion.button>
                </div>
                
                <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -10 }}
                    className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-3xl relative overflow-hidden group"
                  >
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] group-hover:bg-teal-500/20 transition-all duration-700" />
                    <div className="relative z-10 space-y-8">
                      <div className="p-6 bg-white/5 rounded-[2rem] w-fit border border-white/10">
                        <Bot className="w-12 h-12 text-teal-400" />
                      </div>
                      <div>
                        <h3 className="text-4xl font-black mb-4 tracking-tight">Нужна помощь?</h3>
                        <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-md">
                          Наш ИИ-ассистент поможет вам определить симптомы и подобрать нужного врача за считанные секунды.
                        </p>
                      </div>
                      <button 
                        onClick={() => setCurrentPage('ai-assistant')}
                        className="px-10 py-6 bg-teal-600 text-white rounded-[2rem] font-black text-lg hover:bg-teal-500 transition-all flex items-center gap-4 shadow-xl shadow-teal-900/40 group/btn"
                      >
                        Запустить ассистента
                        <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
                      </button>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -10 }}
                    className="bg-teal-600 p-12 rounded-[4rem] text-white shadow-3xl relative overflow-hidden group"
                  >
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-[120px] group-hover:bg-white/20 transition-all duration-700" />
                    <div className="relative z-10 space-y-8">
                      <div className="p-6 bg-white/10 rounded-[2rem] w-fit border border-white/20">
                        <Calendar className="w-12 h-12 text-white" />
                      </div>
                      <div>
                        <h3 className="text-4xl font-black mb-4 tracking-tight">Быстрая запись</h3>
                        <p className="text-teal-50 text-xl font-medium leading-relaxed max-w-md">
                          Уже знаете к кому хотите записаться? Перейдите сразу к выбору врача и времени приема.
                        </p>
                      </div>
                      <button 
                        onClick={() => setCurrentPage('booking')}
                        className="px-10 py-6 bg-white text-teal-600 rounded-[2rem] font-black text-lg hover:bg-teal-50 transition-all flex items-center gap-4 shadow-xl shadow-teal-700/40 group/btn"
                      >
                        Выбрать врача
                        <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                </div>

                <section className="py-20 bg-white">
                  <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                      <div className="max-w-2xl">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Наши специалисты</h2>
                        <p className="text-slate-600">
                          В нашей поликлинике работают высококвалифицированные врачи с многолетним опытом. 
                          Выберите специалиста и запишитесь на удобное время.
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                          <div className="relative flex items-center">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Поиск врача или симптомов..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none w-full sm:w-64 transition-all"
                            />
                            <button 
                              onClick={() => setCurrentPage('ai-assistant')}
                              className="absolute right-2 p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"
                              title="Умный поиск"
                            >
                              <Bot className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none cursor-pointer w-full sm:w-48"
                          >
                            {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredDoctors.map((doc) => (
                        <DoctorCard 
                          key={doc.id} 
                          doctor={doc} 
                          onSelect={(doc) => setSelectedDoctor(doc)} 
                        />
                      ))}
                    </div>

                    {filteredDoctors.length === 0 && (
                      <div className="py-20 text-center">
                        <p className="text-slate-500">Врачи не найдены по вашему запросу.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* News Section */}
                <section className="py-32 bg-slate-900 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
                  </div>
                  
                  <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 text-teal-400 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
                          Новости поликлиники
                        </div>
                        <h2 className="text-5xl font-black text-white tracking-tight">Будьте в курсе событий</h2>
                      </div>
                      <button 
                        onClick={() => setShowNewsHistory(true)}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all border border-white/10 flex items-center gap-3"
                      >
                        <Clock className="w-5 h-5" />
                        История новостей
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {news.slice(0, 3).map((item: any) => (
                        <motion.div 
                          key={item.id}
                          whileHover={{ y: -10 }}
                          className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden flex flex-col"
                        >
                          {item.image && (
                            <div className="h-64 overflow-hidden">
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="p-10 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-teal-400" />
                              </div>
                              <span className="text-xs text-slate-400 font-bold">
                                {format(parseISO(item.created_at), 'd MMMM yyyy', { locale: ru })}
                              </span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4 leading-tight group-hover:text-teal-400 transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-8 flex-1">
                              {item.content}
                            </p>
                            <button 
                              onClick={() => setSelectedNews(item)}
                              className="flex items-center gap-3 text-teal-400 font-black text-xs uppercase tracking-widest group/btn"
                            >
                              Читать далее
                              <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-2" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {currentPage === 'booking' && (
              <motion.div
                key="booking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {!user ? (
                  <div className="max-w-md mx-auto py-20 px-4 text-center">
                    <div className="inline-block p-6 bg-teal-50 rounded-full mb-6">
                      <LogIn className="w-12 h-12 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Требуется авторизация</h2>
                    <p className="text-slate-600 mb-8">Для записи на прием, пожалуйста, войдите в систему.</p>
                    <button 
                      onClick={() => setShowAuthModal('login')}
                      className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      Войти
                    </button>
                  </div>
                ) : (
                  <BookingForm 
                    doctors={doctors}
                    specialties={specialties.filter(s => s !== 'Все')}
                    user={user}
                    userAppointments={appointments}
                    preSelectedDoctor={preSelectedDoctor}
                    onComplete={(apt) => {
                      handleAddAppointment(apt);
                      setPreSelectedDoctor(null);
                    }} 
                    onCancel={() => {
                      setCurrentPage('home');
                      setPreSelectedDoctor(null);
                    }} 
                  />
                )}
              </motion.div>
            )}

            {currentPage === 'ai-assistant' && (
              <motion.div
                key="ai-assistant"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-12"
              >
                <SymptomAssistant 
                  key={user ? `user-${user.id}` : 'guest'}
                  doctors={doctors}
                  onSelectDoctor={handleAISelectDoctor}
                  user={user}
                />
              </motion.div>
            )}

            {currentPage === 'appointments' && (
              <motion.div
                key="appointments"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {!user ? (
                  <div className="max-w-md mx-auto py-20 px-4 text-center">
                    <div className="inline-block p-6 bg-slate-50 rounded-full mb-6">
                      <User className="w-12 h-12 text-slate-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Ваши записи</h2>
                    <p className="text-slate-600 mb-8">Войдите, чтобы просмотреть свои записи на прием.</p>
                    <button 
                      onClick={() => setShowAuthModal('login')}
                      className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      Войти
                    </button>
                  </div>
                ) : (
                  <AppointmentList 
                    appointments={appointments} 
                    onCancel={handleCancelAppointment}
                    onRefresh={loadAppointments}
                    onAddToCalendar={handleAddToCalendar}
                  />
                )}
              </motion.div>
            )}

            {currentPage === 'profile' && user && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <UserProfile 
                  user={user} 
                  onUpdate={setUser}
                  onLogout={handleLogout}
                  appointmentsCount={appointments.length}
                />
              </motion.div>
            )}

            {currentPage === 'admin' && user?.role === 'admin' && (
              <AdminDashboard onDataUpdate={() => {
                loadInitialData();
                loadNews();
              }} />
            )}
          </AnimatePresence>
        </main>

        {/* Doctor Profile Modal */}
        <AnimatePresence>
          {selectedDoctor && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDoctor(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="relative h-48 bg-teal-600">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <button 
                    onClick={() => setSelectedDoctor(null)}
                    className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                  >
                    <AlertCircle className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                
                <div className="px-8 pb-8">
                  <div className="relative -mt-20 mb-6">
                    <img 
                      src={selectedDoctor.photo} 
                      alt={selectedDoctor.name} 
                      className="w-40 h-40 rounded-3xl border-8 border-white object-cover shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 left-32 bg-emerald-500 text-white p-2 rounded-xl shadow-lg">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                      <p className="text-teal-600 font-black uppercase tracking-widest text-sm mb-1">{selectedDoctor.specialty}</p>
                      <h2 className="text-3xl font-black text-slate-900 mb-2">{selectedDoctor.name}</h2>
                      <div className="flex items-center gap-4 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-slate-900">
                            {doctorReviews.length > 0 
                              ? (doctorReviews.reduce((acc, r) => acc + r.rating, 0) / doctorReviews.length).toFixed(1)
                              : '5.0'}
                          </span>
                          <span className="text-xs font-bold">({doctorReviews.length} отзывов)</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-teal-500" />
                          <span className="font-bold text-slate-900">{selectedDoctor.experience} лет опыта</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setPreSelectedDoctor(selectedDoctor);
                        setCurrentPage('booking');
                        setSelectedDoctor(null);
                      }}
                      className="px-10 py-5 bg-teal-600 text-white rounded-2xl font-black text-sm hover:bg-teal-700 transition-all shadow-xl shadow-teal-100 flex items-center gap-3"
                    >
                      <Calendar className="w-5 h-5" />
                      Записаться на прием
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">О специалисте</h4>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {selectedDoctor.bio || 'Высококвалифицированный специалист с многолетним опытом работы. Специализируется на современных методах диагностики и лечения.'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Образование</h4>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {selectedDoctor.education || 'Высшее медицинское образование, регулярное повышение квалификации в ведущих медицинских центрах.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Отзывы пациентов</h4>
                      </div>
                      
                      <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                        {doctorReviews.length === 0 ? (
                          <div className="text-center py-10 bg-slate-50 rounded-3xl">
                            <Bot className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold">Пока нет отзывов</p>
                          </div>
                        ) : (
                          doctorReviews.map((review: any) => (
                            <div key={review.id} className="p-6 bg-slate-50 rounded-3xl space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="font-black text-slate-900 text-sm">{review.patient_name}</div>
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-3 h-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                {review.comment}
                              </p>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {format(parseISO(review.created_at), 'd MMMM yyyy', { locale: ru })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* News History Modal */}
        <AnimatePresence>
          {showNewsHistory && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNewsHistory(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-500 rounded-2xl text-white">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">История новостей</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Все публикации поликлиники</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNewsHistory(false)}
                    className="p-4 bg-white hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors shadow-sm"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {news.map((item: any) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all"
                      >
                        {item.image && (
                          <div className="h-48 overflow-hidden">
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="p-8 flex-1 flex flex-col">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest px-3 py-1 bg-teal-50 rounded-full">
                              {format(parseISO(item.created_at), 'd MMMM yyyy', { locale: ru })}
                            </span>
                          </div>
                          <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight group-hover:text-teal-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                            {item.content}
                          </p>
                          <button 
                            onClick={() => {
                              setSelectedNews(item);
                              setShowNewsHistory(false);
                            }}
                            className="flex items-center gap-3 text-teal-600 font-black text-xs uppercase tracking-widest group/btn"
                          >
                            Читать полностью
                            <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-2" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* News Modal */}
        <AnimatePresence>
          {selectedNews && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedNews(null)}
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {selectedNews.image && (
                  <div className="h-80 w-full">
                    <img src={selectedNews.image} alt={selectedNews.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-teal-50 rounded-2xl">
                      <FileText className="w-6 h-6 text-teal-600" />
                    </div>
                    <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                      {format(parseISO(selectedNews.created_at), 'd MMMM yyyy', { locale: ru })}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 mb-8 leading-tight">{selectedNews.title}</h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 text-xl leading-relaxed font-medium whitespace-pre-wrap">
                      {selectedNews.content}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedNews(null)}
                    className="mt-12 w-full py-6 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <Footer />

        {/* Auth Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] custom-scrollbar"
                >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {showAuthModal === 'login' ? 'Вход в систему' : showAuthModal === 'register' ? 'Регистрация' : 'Восстановление пароля'}
                    </h2>
                    <button onClick={() => setShowAuthModal(null)} className="text-slate-400 hover:text-slate-600">
                      <ChevronRight className="w-6 h-6 rotate-90" />
                    </button>
                  </div>

                  <form onSubmit={
                    showAuthModal === 'login' ? handleLogin : 
                    showAuthModal === 'register' ? handleRegister : 
                    showAuthModal === 'forgot-password' ? handleForgotPassword : 
                    handleResetPassword
                  } className="space-y-4">
                    {showAuthModal === 'register' && (
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <User className="w-4 h-4" /> ФИО
                        </label>
                        <input 
                          type="text" 
                          required
                          value={authForm.name}
                          onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    )}
                    {(showAuthModal === 'login' || showAuthModal === 'register' || showAuthModal === 'forgot-password') && (
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Mail className="w-4 h-4" /> Email
                        </label>
                        <input 
                          type="email" 
                          required
                          value={authForm.email}
                          onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    )}
                    {(showAuthModal === 'login' || showAuthModal === 'register' || showAuthModal === 'reset-password') && (
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Lock className="w-4 h-4" /> {showAuthModal === 'reset-password' ? 'Новый пароль' : 'Пароль'}
                        </label>
                        <input 
                          type="password" 
                          required
                          value={authForm.password}
                          onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    )}
                    {showAuthModal === 'register' && (
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Phone className="w-4 h-4" /> Телефон
                        </label>
                        <input 
                          type="tel" 
                          required
                          value={authForm.phone}
                          onChange={handlePhoneChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                          placeholder="+7 (___) ___-__-__"
                        />
                      </div>
                    )}

                    <button className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all mt-4">
                      {showAuthModal === 'login' ? 'Войти' : 
                       showAuthModal === 'register' ? 'Зарегистрироваться' : 
                       showAuthModal === 'forgot-password' ? 'Отправить ссылку' : 
                       'Обновить пароль'}
                    </button>
                  </form>

                  <div className="mt-6 space-y-3 text-center text-sm">
                    {showAuthModal === 'login' && (
                      <button 
                        onClick={() => setShowAuthModal('forgot-password')}
                        className="block w-full text-slate-500 hover:text-teal-600 transition-colors"
                      >
                        Забыли пароль?
                      </button>
                    )}
                    {(showAuthModal === 'forgot-password' || showAuthModal === 'reset-password') && (
                      <button 
                        onClick={() => setShowAuthModal('login')}
                        className="block w-full text-teal-600 font-bold hover:underline"
                      >
                        Вернуться к входу
                      </button>
                    )}
                    {(showAuthModal === 'login' || showAuthModal === 'register') && (
                      <button 
                        onClick={() => setShowAuthModal(showAuthModal === 'login' ? 'register' : 'login')}
                        className="text-teal-600 font-bold hover:underline"
                      >
                        {showAuthModal === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}



