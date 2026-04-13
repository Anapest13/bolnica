import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Phone, CheckCircle2, Sparkles, Bot, ArrowRight, Award, Stethoscope, Heart, ShieldCheck, Loader2 } from 'lucide-react';
import { Doctor, Specialty, Appointment } from '../types';
import { format, parseISO, isSameDay, isSameHour } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { api } from '../services/api';

interface BookingFormProps {
  doctors: Doctor[];
  specialties: string[];
  user: any;
  userAppointments: Appointment[];
  preSelectedDoctor?: Doctor | null;
  onComplete: (appointment: any) => void;
  onCancel: () => void;
}

export default function BookingForm({ doctors, specialties, user, userAppointments, preSelectedDoctor, onComplete, onCancel }: BookingFormProps) {
  const [step, setStep] = useState(preSelectedDoctor ? 3 : 1);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(preSelectedDoctor?.specialty || null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(preSelectedDoctor || null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<{ date: string; time: string }[]>([]);
  const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);
  const [patientInfo, setPatientInfo] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '+7', 
    reason: '' 
  });

  useEffect(() => {
    if (selectedDoctor) {
      const fetchBusySlots = async () => {
        setIsLoadingBusySlots(true);
        try {
          const slots = await api.getBusySlots(selectedDoctor.id);
          setBusySlots(slots);
        } catch (error) {
          console.error('Error fetching busy slots:', error);
          toast.error('Не удалось загрузить занятые слоты');
        } finally {
          setIsLoadingBusySlots(false);
        }
      };
      fetchBusySlots();
    }
  }, [selectedDoctor]);


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
    setPatientInfo({ ...patientInfo, phone: formatted });
  };

  const generateSlots = () => {
    const slots = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      times.forEach(t => {
        const [h, m] = t.split(':');
        const slotDate = new Date(date);
        slotDate.setHours(parseInt(h), parseInt(m), 0, 0);
        slots.push(slotDate.toISOString());
      });
    }
    return slots;
  };

  const availableSlots = generateSlots().filter(slot => {
    const slotDate = format(parseISO(slot), 'yyyy-MM-dd');
    const slotTime = format(parseISO(slot), 'HH:mm');
    
    // Check if doctor is busy
    const isDoctorBusy = busySlots.some(busy => busy.date === slotDate && busy.time === slotTime);
    if (isDoctorBusy) return false;

    // Check if user already has an appointment at this time
    const isUserBusy = userAppointments.some(apt => 
      apt.status !== 'cancelled' && 
      apt.date === slotDate && 
      apt.time === slotTime
    );
    if (isUserBusy) return false;

    return true;
  });

  const filteredDoctors = selectedSpecialty 
    ? doctors.filter(d => d.specialty.trim() === selectedSpecialty.trim())
    : [];

  const handleComplete = () => {
    if (!selectedDoctor || !selectedSlot) {
      toast.error('Пожалуйста, выберите врача и время');
      return;
    }
    
    if (patientInfo.reason.length < 5) {
      toast.error('Пожалуйста, опишите причину визита подробнее');
      return;
    }

    const phoneDigits = patientInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length < 11) {
      toast.error('Некорректный номер телефона');
      return;
    }

    const slotDate = format(parseISO(selectedSlot), 'yyyy-MM-dd');
    const slotTime = format(parseISO(selectedSlot), 'HH:mm');

    // Final check before sending to server
    const isUserBusy = userAppointments.some(apt => 
      apt.status !== 'cancelled' && 
      apt.date === slotDate && 
      apt.time === slotTime
    );

    if (isUserBusy) {
      toast.error('У вас уже есть запись на это время к другому специалисту');
      return;
    }

    onComplete({
      doctorId: selectedDoctor.id,
      date: slotDate,
      time: slotTime,
      reason: patientInfo.reason
    } as any);
  };

  const steps = [
    { id: 1, title: 'Направление', icon: Stethoscope },
    { id: 2, title: 'Специалист', icon: User },
    { id: 3, title: 'Время', icon: Clock },
    { id: 4, title: 'Данные', icon: ShieldCheck },
  ];

  return (
    <div className="max-w-6xl mx-auto py-16 px-6">
      <div className="bg-white rounded-[4rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.15)] border border-slate-50 overflow-hidden relative">
        {/* Progress Header */}
        <div className="bg-slate-950 p-10 md:p-16 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12">
            <Sparkles className="w-64 h-64" />
          </div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/20 rounded-full blur-[100px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/20 text-teal-400 text-[10px] font-black rounded-full mb-6 uppercase tracking-[0.2em]"
              >
                <Heart className="w-3.5 h-3.5" />
                Быстрая запись
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Запись на прием</h2>
              <p className="text-slate-400 text-lg font-medium max-w-md">Забронируйте визит к врачу за несколько простых шагов</p>
            </div>

            <div className="flex items-center gap-4">
              {steps.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-3">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                      s.id <= step 
                        ? 'bg-teal-500 border-teal-400 text-white shadow-[0_0_30px_rgba(20,184,166,0.4)]' 
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    <s.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${s.id <= step ? 'text-teal-400' : 'text-slate-700'}`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-10 md:p-20">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-16"
              >
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Выберите специализацию</h2>
                  <p className="text-slate-500 text-xl font-medium leading-relaxed">Мы подготовили список лучших направлений для вашего удобства</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {specialties.filter(s => s !== 'Все').map((spec) => (
                    <motion.button
                      key={spec}
                      whileHover={{ y: -10, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedSpecialty(spec);
                        setStep(2);
                      }}
                      className={`p-10 rounded-[3rem] border-2 transition-all text-center flex flex-col items-center gap-6 group relative overflow-hidden ${
                        selectedSpecialty === spec 
                          ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-2xl shadow-teal-100' 
                          : 'border-slate-50 bg-slate-50/50 hover:border-teal-200 hover:bg-white text-slate-600 hover:shadow-2xl'
                      }`}
                    >
                      <div className={`p-6 rounded-3xl transition-all duration-500 ${selectedSpecialty === spec ? 'bg-teal-500 text-white rotate-12' : 'bg-white group-hover:bg-teal-50 group-hover:rotate-6'}`}>
                        <Stethoscope className={`w-10 h-10 ${selectedSpecialty === spec ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'}`} />
                      </div>
                      <span className="font-black text-base uppercase tracking-wider">{spec}</span>
                      {selectedSpecialty === spec && (
                        <motion.div layoutId="activeSpec" className="absolute inset-0 bg-teal-500/5 -z-10" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-16"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                    <motion.button 
                      whileHover={{ x: -5 }}
                      onClick={() => setStep(1)} 
                      className="p-5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-[1.5rem] transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </motion.button>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Выберите врача</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{selectedSpecialty}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredDoctors.map((doc) => (
                    <motion.button
                      key={doc.id}
                      whileHover={{ scale: 1.02, y: -5 }}
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setStep(3);
                      }}
                      className={`p-6 rounded-[2.5rem] border-2 transition-all text-left flex items-center gap-6 group relative overflow-hidden ${
                        selectedDoctor?.id === doc.id 
                          ? 'border-teal-500 bg-teal-50 shadow-xl shadow-teal-100' 
                          : 'border-slate-50 bg-slate-50/50 hover:border-teal-200 hover:bg-white hover:shadow-xl'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img src={doc.photo} alt={doc.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-md border border-slate-50">
                          <Award className="w-4 h-4 text-teal-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-teal-600 transition-colors leading-tight truncate">{doc.name}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-white rounded-md text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                            {doc.experience} лет опыта
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-all shrink-0">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-16"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                    <motion.button 
                      whileHover={{ x: -5 }}
                      onClick={() => setStep(2)} 
                      className="p-5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-[1.5rem] transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </motion.button>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Выберите время</h2>
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-500" />
                        {selectedDoctor?.name}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {isLoadingBusySlots ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Загрузка свободных окон...</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    availableSlots.map((slot) => (
                      <motion.button
                        key={slot}
                        whileHover={{ y: -8, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setStep(4);
                        }}
                        className={`p-8 rounded-[2.5rem] border-2 transition-all text-center flex flex-col gap-3 group relative overflow-hidden ${
                          selectedSlot === slot 
                            ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-2xl shadow-teal-100' 
                            : 'border-slate-50 bg-slate-50/50 hover:border-teal-200 hover:bg-white hover:shadow-2xl text-slate-600'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{format(parseISO(slot), 'd MMMM', { locale: ru })}</span>
                        <span className="text-3xl font-black tracking-tight">{format(parseISO(slot), 'HH:mm')}</span>
                        {selectedSlot === slot && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-teal-500" />
                          </div>
                        )}
                      </motion.button>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-slate-500 font-bold">Нет доступного времени для записи</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="space-y-16"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                    <motion.button 
                      whileHover={{ x: -5 }}
                      onClick={() => setStep(3)} 
                      className="p-5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-[1.5rem] transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </motion.button>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Ваши данные</h2>
                      <p className="text-slate-500 text-lg font-medium">Почти готово! Оставьте контакты для подтверждения</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-16">
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <User className="w-5 h-5 text-teal-500" /> ФИО Пациента
                      </label>
                      <input 
                        type="text"
                        value={patientInfo.name}
                        onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                        placeholder="Иванов Иван Иванович"
                        className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white outline-none transition-all font-bold text-slate-900 text-lg shadow-sm"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Phone className="w-5 h-5 text-blue-500" /> Номер телефона
                      </label>
                      <input 
                        type="tel"
                        value={patientInfo.phone}
                        onChange={handlePhoneChange}
                        placeholder="+7 (___) ___-__-__"
                        className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white outline-none transition-all font-bold text-slate-900 text-lg shadow-sm"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Bot className="w-5 h-5 text-purple-500" /> Причина обращения
                      </label>
                      <textarea 
                        value={patientInfo.reason}
                        onChange={(e) => setPatientInfo({ ...patientInfo, reason: e.target.value })}
                        placeholder="Кратко опишите ваши жалобы..."
                        rows={4}
                        className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white outline-none transition-all font-bold text-slate-900 text-lg shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="bg-slate-950 p-12 rounded-[3.5rem] text-white shadow-3xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle2 className="w-64 h-64" />
                      </div>
                      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px]" />
                      
                      <h4 className="text-2xl font-black mb-12 uppercase tracking-[0.2em] text-teal-400">Резюме записи</h4>
                      
                      <div className="space-y-10 relative z-10">
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <User className="w-8 h-8 text-teal-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Специалист</p>
                            <p className="text-2xl font-black tracking-tight">{selectedDoctor?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <Calendar className="w-8 h-8 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Дата и время</p>
                            <p className="text-2xl font-black tracking-tight">
                              {selectedSlot && format(parseISO(selectedSlot), 'd MMMM, HH:mm', { locale: ru })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Безопасность</p>
                            <p className="text-2xl font-black tracking-tight">Данные защищены</p>
                          </div>
                        </div>
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleComplete}
                        disabled={!patientInfo.name || patientInfo.phone.replace(/\D/g, '').length < 11}
                        className="w-full mt-16 py-8 bg-teal-600 text-white rounded-[2rem] font-black text-2xl hover:bg-teal-500 transition-all shadow-[0_20px_50px_-15px_rgba(20,184,166,0.5)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-4 group"
                      >
                        Подтвердить запись
                        <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
