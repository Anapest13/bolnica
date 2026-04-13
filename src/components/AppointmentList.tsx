import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, User, Trash2, CheckCircle2, AlertCircle, MapPin, Phone, ChevronRight, Sparkles, Activity, ShieldCheck, ArrowRight, X, Info, Stethoscope, Mail, Star, MessageSquare, Send, FileText, Edit2 } from 'lucide-react';
import { Appointment } from '../types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api } from '../services/api';
import { toast } from 'sonner';

interface AppointmentListProps {
  appointments: Appointment[];
  onCancel: (id: number) => void;
  onRefresh: () => void;
  onAddToCalendar: (apt: Appointment) => void;
}

export default function AppointmentList({ appointments, onCancel, onRefresh, onAddToCalendar }: AppointmentListProps) {
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<Appointment | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReviewModal) return;
    
    setSubmittingReview(true);
    try {
      await api.createReview({
        doctorId: showReviewModal.doctor_id,
        appointmentId: showReviewModal.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });
      toast.success(showReviewModal.reviewRating ? 'Отзыв обновлен!' : 'Спасибо за ваш отзыв!');
      setShowReviewModal(null);
      setReviewForm({ rating: 5, comment: '' });
      onRefresh();
    } catch (e) {
      toast.error('Ошибка при сохранении отзыва');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-48 px-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block p-16 bg-slate-50 rounded-[4rem] mb-12 relative group"
        >
          <div className="absolute -top-6 -right-6 p-6 bg-white rounded-3xl shadow-2xl border border-slate-50 group-hover:scale-110 transition-transform">
            <Sparkles className="w-8 h-8 text-teal-500" />
          </div>
          <Calendar className="w-32 h-32 text-slate-200 group-hover:text-teal-100 transition-colors duration-500" />
        </motion.div>
        <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">У вас пока нет записей</h2>
        <p className="text-slate-500 text-xl font-medium max-w-lg mx-auto mb-16 leading-relaxed">
          Ваш список визитов пуст. Запишитесь на прием к нашим специалистам, чтобы начать путь к здоровому будущему.
        </p>
        <motion.button 
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          className="px-12 py-6 bg-teal-600 text-white rounded-[2rem] font-black text-xl shadow-[0_20px_50px_-15px_rgba(20,184,166,0.4)] hover:bg-teal-500 transition-all flex items-center justify-center gap-4 mx-auto group"
        >
          Записаться на прием
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-24 px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-full uppercase tracking-[0.2em]"
          >
            <Activity className="w-3.5 h-3.5" />
            Личный кабинет
          </motion.div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tight">Мои записи</h2>
        </div>
        <div className="flex items-center gap-5 px-8 py-4 bg-slate-950 text-white rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Calendar className="w-6 h-6 text-teal-400 relative z-10" />
          <span className="font-black text-base uppercase tracking-widest relative z-10">
            Всего визитов: {appointments.length}
          </span>
        </div>
      </div>

      <div className="grid gap-10">
        {appointments.map((apt, index) => (
          <motion.div
            key={apt.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="group bg-white rounded-[3.5rem] border border-slate-50 p-10 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.08)] hover:shadow-[0_50px_150px_-30px_rgba(0,0,0,0.15)] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-3 h-full transition-all duration-500 group-hover:w-4 ${
              apt.status === 'scheduled' ? 'bg-teal-500' : 
              apt.status === 'cancelled' ? 'bg-rose-500' : 
              'bg-slate-300'
            }`} />

            <div className="flex items-start gap-10">
              <div className="relative flex-shrink-0">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] group-hover:bg-teal-50 transition-all duration-500 group-hover:scale-105">
                  <User className="w-12 h-12 text-slate-400 group-hover:text-teal-600 transition-colors" />
                </div>
                <div className={`absolute -bottom-3 -right-3 p-3 rounded-2xl shadow-xl border-4 border-white ${
                  apt.status === 'scheduled' ? 'bg-teal-500' : 
                  apt.status === 'cancelled' ? 'bg-rose-500' : 
                  'bg-slate-400'
                }`}>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50 px-4 py-1.5 rounded-full border border-teal-100">
                      {apt.specialty}
                    </span>
                    <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] border ${
                      apt.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                      apt.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {apt.status === 'scheduled' ? 'Предстоит' : 
                       apt.status === 'cancelled' ? 'Отменено' : 
                       'Завершено'}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-3xl tracking-tight group-hover:text-teal-600 transition-colors leading-tight">{apt.doctorName}</h3>
                  {apt.reason && (
                    <div className="mt-4 p-5 bg-slate-50/50 rounded-2xl border-l-4 border-teal-500 italic text-slate-600 text-lg font-medium">
                      "{apt.reason}"
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-4 text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-teal-50 group-hover:text-teal-600 transition-all">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg">
                      {(() => {
                        try {
                          const datePart = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
                          return format(parseISO(`${datePart}T${apt.time}`), 'd MMMM yyyy', { locale: ru });
                        } catch (e) {
                          return apt.date;
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-teal-50 group-hover:text-teal-600 transition-all">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg">{apt.time.slice(0, 5)}</span>
                  </div>
                  {apt.status === 'scheduled' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCalendar(apt);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <Calendar className="w-4 h-4" />
                      В календарь
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 lg:border-l lg:pl-12 border-slate-100">
              {apt.status === 'scheduled' && (
                <motion.button 
                  whileHover={{ scale: 1.05, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onCancel(apt.id)}
                  className="flex-1 lg:flex-none px-10 py-5 text-rose-600 font-black uppercase tracking-widest text-xs hover:bg-rose-50 rounded-[1.5rem] transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-5 h-5" />
                  Отменить
                </motion.button>
              )}
              {apt.status === 'completed' && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowReviewModal(apt);
                    setReviewForm({ 
                      rating: apt.reviewRating || 5, 
                      comment: apt.reviewComment || '' 
                    });
                  }}
                  className={`flex-1 lg:flex-none px-10 py-5 font-black uppercase tracking-widest text-xs rounded-[1.5rem] transition-all flex items-center justify-center gap-3 ${
                    apt.reviewRating 
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                      : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                  }`}
                >
                  {apt.reviewRating ? <Edit2 className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                  {apt.reviewRating ? 'Ваш отзыв' : 'Оставить отзыв'}
                </motion.button>
              )}
              <motion.button 
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedApt(apt)}
                className="flex-1 lg:flex-none px-10 py-5 bg-slate-950 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-900 rounded-[1.5rem] transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 group/btn"
              >
                Детали
                <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {selectedApt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 md:p-16">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
                      Детали записи
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Информация о визите</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedApt(null)}
                    className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div className="space-y-8">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-teal-50 rounded-2xl">
                        <User className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Врач</p>
                        <p className="text-xl font-black text-slate-900">{selectedApt.doctorName}</p>
                        <p className="text-sm font-bold text-teal-600 uppercase">{selectedApt.specialty}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-teal-50 rounded-2xl">
                        <Calendar className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Дата и время</p>
                        <p className="text-xl font-black text-slate-900">
                          {(() => {
                            try {
                              const datePart = selectedApt.date.includes('T') ? selectedApt.date.split('T')[0] : selectedApt.date;
                              return format(parseISO(`${datePart}T${selectedApt.time}`), 'd MMMM yyyy', { locale: ru });
                            } catch (e) {
                              return selectedApt.date;
                            }
                          })()}
                        </p>
                        <p className="text-sm font-bold text-slate-500">{selectedApt.time.slice(0, 5)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-teal-50 rounded-2xl">
                        <Info className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Статус</p>
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          selectedApt.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : 
                          selectedApt.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {selectedApt.status === 'scheduled' ? 'Предстоит' : 
                           selectedApt.status === 'cancelled' ? 'Отменено' : 
                           'Завершено'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-teal-50 rounded-2xl">
                        <MapPin className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Место</p>
                        <p className="text-lg font-bold text-slate-900">Главный корпус, каб. 302</p>
                        <p className="text-sm text-slate-500">ул. Ленина, 45</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedApt.reason && (
                  <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Жалобы / Причина визита</p>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border-l-8 border-teal-500 italic text-slate-700 text-xl font-medium leading-relaxed">
                      "{selectedApt.reason}"
                    </div>
                  </div>
                )}

                {selectedApt.notes && (
                  <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Заключение врача / Рекомендации</p>
                    <div className="p-8 bg-emerald-50 rounded-[2rem] border-l-8 border-emerald-500 text-slate-700 text-xl font-medium leading-relaxed">
                      {selectedApt.notes}
                    </div>
                  </div>
                )}

                {selectedApt.attachment_url && (
                  <div className="mb-12">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Прикрепленные документы</p>
                    <a 
                      href={selectedApt.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-6 bg-slate-50 hover:bg-teal-50 rounded-2xl border border-slate-100 transition-all group"
                    >
                      <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-teal-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Скан справки / Заключение</p>
                        <p className="text-xs text-slate-400">Нажмите, чтобы открыть PDF</p>
                      </div>
                    </a>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  {selectedApt.status === 'scheduled' && (
                    <button 
                      onClick={() => {
                        onCancel(selectedApt.id);
                        setSelectedApt(null);
                      }}
                      className="flex-1 py-6 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-100 transition-all flex items-center justify-center gap-3"
                    >
                      <Trash2 className="w-5 h-5" />
                      Отменить запись
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedApt(null)}
                    className="flex-1 py-6 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmitReview} className="p-10 md:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 text-[9px] font-black rounded-full uppercase tracking-widest mb-2">
                      Ваш отзыв
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Оцените прием</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowReviewModal(null)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="text-center">
                    <p className="text-slate-500 font-bold mb-4">Ваша оценка врачу {showReviewModal.doctorName}</p>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className="group focus:outline-none"
                        >
                          <Star 
                            className={`w-10 h-10 transition-all ${
                              star <= reviewForm.rating 
                                ? 'text-amber-400 fill-amber-400 scale-110' 
                                : 'text-slate-200 hover:text-amber-200'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Комментарий</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                      <textarea 
                        value={reviewForm.comment}
                        onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        rows={4}
                        placeholder="Поделитесь вашими впечатлениями..."
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                  >
                    {submittingReview ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Отправить отзыв
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-24 p-12 bg-slate-950 rounded-[4rem] text-white flex flex-col md:flex-row items-center gap-12 relative overflow-hidden shadow-3xl group"
      >
        <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
          <AlertCircle className="w-64 h-64" />
        </div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px]" />
        
        <div className="p-8 bg-teal-500/20 rounded-[2.5rem] shrink-0 border border-teal-500/20">
          <ShieldCheck className="w-16 h-16 text-teal-400" />
        </div>
        <div className="space-y-4 text-center md:text-left relative z-10">
          <h4 className="text-2xl font-black uppercase tracking-[0.2em] text-teal-400">Важная информация</h4>
          <p className="text-slate-400 font-medium text-xl leading-relaxed max-w-3xl">
            Пожалуйста, приходите за 15 минут до начала приема для оформления документов. 
            Не забудьте взять с собой паспорт и полис ОМС для подтверждения личности.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
