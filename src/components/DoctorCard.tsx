import React, { useState } from 'react';
import { Star, Clock, Award, ChevronRight, Sparkles, MessageSquare, X, User } from 'lucide-react';
import { Doctor } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DoctorCardProps {
  doctor: Doctor;
  onSelect: (doctor: Doctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onSelect }) => {
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const data = await api.getDoctorReviews(doctor.id);
      setReviews(data);
    } catch (e) {
      console.error('Failed to fetch reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleOpenReviews = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReviews(true);
    fetchReviews();
  };
  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      onClick={() => onSelect(doctor)}
      className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 hover:shadow-2xl transition-all group cursor-pointer relative"
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={doctor.photo} 
          alt={doctor.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
        
        <div className="absolute top-4 right-4">
          <div className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/20">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Топ специалист
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-teal-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg">
              {doctor.specialty}
            </span>
            <button 
              onClick={handleOpenReviews}
              className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-black flex items-center gap-1 border border-white/10 hover:bg-white/40 transition-all cursor-pointer"
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {doctor.rating}
            </button>
          </div>
          <h3 className="text-2xl font-black text-white leading-tight">{doctor.name}</h3>
        </div>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-teal-50 transition-colors">
              <Award className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Стаж: {doctor.experience} лет</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-teal-50 transition-colors">
              <Clock className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Доступен</span>
          </div>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 font-medium">
          {doctor.description}
        </p>

        <button 
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black group-hover:bg-teal-600 transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          Записаться на прием
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <AnimatePresence>
        {showReviews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviews(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-50 rounded-2xl">
                    <MessageSquare className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Отзывы о враче</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{doctor.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReviews(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                {loadingReviews ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold">Загрузка отзывов...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="p-6 bg-slate-50 rounded-full inline-block mb-4">
                      <MessageSquare className="w-12 h-12 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">Отзывов пока нет. Будьте первым!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 border border-slate-100 shadow-sm">
                            {review.patientName[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{review.patientName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {format(parseISO(review.created_at), 'd MMMM yyyy', { locale: ru })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-black text-slate-900">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed italic">
                        "{review.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DoctorCard;
