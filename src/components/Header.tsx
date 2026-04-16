import { Activity, Calendar, User, Phone, LogIn, LogOut, Menu, X, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface HeaderProps {
  onNavigate: (page: 'home' | 'appointments' | 'booking' | 'ai-assistant' | 'admin' | 'profile') => void;
  currentPage: string;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Header({ onNavigate, currentPage, user, onLogin, onLogout }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Главная', icon: Activity },
    { id: 'ai-assistant', label: 'ИИ-Помощник', icon: Bot, highlight: true },
    { id: 'booking', label: 'Записаться', icon: Calendar },
    { id: 'appointments', label: 'Мои записи', icon: Calendar },
    { id: 'profile', label: 'Профиль', icon: User },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Админ', icon: Activity }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-2xl border-b border-slate-100/50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onNavigate('home')}
        >
          <div className="relative">
            <div className="p-2.5 bg-slate-900 rounded-2xl group-hover:bg-teal-600 transition-all duration-500 shadow-xl shadow-slate-200 group-hover:shadow-teal-100">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm md:text-xl font-black text-slate-900 tracking-tight leading-none truncate overflow-hidden">
              Дзун-Хемчикский ММЦ
            </span>
            <span className="text-[8px] md:text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mt-1">
              ГБУЗ РТ
            </span>
          </div>
        </motion.div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`relative px-5 py-2.5 text-sm font-black uppercase tracking-widest transition-all rounded-xl flex items-center gap-2 group ${
                currentPage === item.id 
                  ? 'text-teal-600 bg-teal-50/50' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              } ${item.highlight ? 'text-teal-600' : ''}`}
            >
              {item.highlight && <Sparkles className="w-3 h-3 animate-pulse" />}
              {item.label}
              {currentPage === item.id && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-500 rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">{user.name}</p>
                <button 
                  onClick={onLogout}
                  className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors"
                >
                  Выйти
                </button>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('profile')}
                className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center bg-slate-50 shadow-lg shadow-slate-100 ${
                  currentPage === 'profile' ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-teal-500'
                }`}
              >
                <User className={`w-6 h-6 ${currentPage === 'profile' ? 'text-teal-600' : 'text-slate-400'}`} />
              </motion.button>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogin}
              className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-teal-600 transition-all flex items-center gap-3 shadow-xl shadow-slate-200"
            >
              <LogIn className="w-4 h-4" />
              Войти
            </motion.button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-3 bg-slate-50 rounded-2xl text-slate-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="container mx-auto px-6 py-8 space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id as any);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all ${
                    currentPage === item.id 
                      ? 'bg-teal-50 text-teal-700 shadow-lg shadow-teal-50' 
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="font-black uppercase tracking-widest text-sm">{item.label}</span>
                </button>
              ))}
              {!user && (
                <button 
                  onClick={() => {
                    onLogin();
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-5 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-4 font-black uppercase tracking-widest text-sm"
                >
                  <LogIn className="w-6 h-6" />
                  Войти в систему
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}


