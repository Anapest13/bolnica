import { motion } from 'motion/react';
import { Calendar, Shield, Clock, Users, Bot, Sparkles, Activity, ArrowRight, Heart, Star, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  onStartBooking: () => void;
  onStartAI: () => void;
}

export default function Hero({ onStartBooking, onStartAI }: HeroProps) {
  return (
    <section className="relative py-32 lg:py-48 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.1),transparent)] -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10" />
      
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-24">
          <div className="flex-1 text-center lg:text-left relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-2xl mb-10 uppercase tracking-[0.3em] shadow-2xl shadow-slate-200">
                <Sparkles className="w-4 h-4 text-teal-400" />
                ГБУЗ РТ "Дзун-Хемчикский ММЦ"
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.95] mb-10 tracking-tight">
                Забота о вашем <br />
                <span className="relative inline-block mt-4">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                    здоровье в Туве
                  </span>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="absolute bottom-4 left-0 h-4 bg-teal-100/50 -z-10 rounded-full"
                  />
                </span>
              </h1>
              
              <p className="text-2xl text-slate-500 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Межжуунный медицинский центр Республики Тыва. 
                Записывайтесь к специалистам онлайн и получайте качественную медицинскую помощь.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                <motion.button 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStartBooking}
                  className="w-full sm:w-auto px-12 py-6 bg-teal-600 text-white rounded-[2rem] font-black text-xl shadow-[0_20px_50px_-15px_rgba(20,184,166,0.4)] hover:bg-teal-500 transition-all flex items-center justify-center gap-4 group"
                >
                  <Calendar className="w-7 h-7" />
                  Записаться
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStartAI}
                  className="w-full sm:w-auto px-12 py-6 bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] font-black text-xl hover:border-teal-200 hover:text-teal-600 transition-all flex items-center justify-center gap-4 shadow-xl shadow-slate-100 group"
                >
                  <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                  ИИ-Помощник
                </motion.button>
              </div>
            </motion.div>

            <div className="mt-20 flex flex-wrap justify-center lg:justify-start gap-12">
              {[
                { label: '10k+', sub: 'Пациентов', icon: Users },
                { label: '50+', sub: 'Специалистов', icon: Star },
                { label: '24/7', sub: 'Поддержка', icon: Clock },
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="p-3 bg-teal-50 rounded-2xl">
                    <stat.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 leading-none mb-1">{stat.label}</p>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div 
            className="flex-1 relative"
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative z-10">
              <div className="rounded-[4rem] overflow-hidden shadow-[0_80px_150px_-30px_rgba(0,0,0,0.2)] border-[16px] border-white relative group">
                <img 
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200" 
                  alt="Medical Center"
                  className="w-full h-auto scale-105 group-hover:scale-100 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-teal-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>

              {/* Floating Cards */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-12 top-1/4 z-20 bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 hidden xl:block"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-emerald-100 rounded-2xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Запись подтверждена</p>
                    <p className="text-xl font-black text-slate-900">Ваш визит завтра в 10:00</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -left-12 bottom-1/4 z-20 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl hidden xl:block"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-teal-500 rounded-2xl">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Здоровье</p>
                    <p className="text-xl font-black">Пульс в норме</p>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Background Blobs */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-teal-400 rounded-full blur-[120px] opacity-20 -z-10 animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-20 -z-10 animate-pulse" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
