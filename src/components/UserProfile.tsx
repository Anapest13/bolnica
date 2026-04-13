import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Lock, Save, ShieldCheck, ChevronRight, LogOut, Activity, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

interface UserProfileProps {
  user: any;
  onUpdate: (user: any) => void;
  onLogout: () => void;
  appointmentsCount: number;
}

export default function UserProfile({ user, onUpdate, onLogout, appointmentsCount }: UserProfileProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone,
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

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
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (formData.phone.length < 11) {
      toast.error('Некорректный номер телефона');
      return;
    }

    setLoading(true);
    try {
      const data = await api.updateProfile({
        name: formData.name,
        phone: formData.phone,
        password: formData.password || undefined
      });
      onUpdate(data.user);
      localStorage.setItem('med_user', JSON.stringify(data.user));
      toast.success('Профиль успешно обновлен');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (e) {
      toast.error('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Sidebar Info */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center"
          >
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-teal-50 rounded-[2.5rem] flex items-center justify-center font-black text-4xl text-teal-600 border-4 border-white shadow-xl">
                {user.name[0]}
              </div>
              <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">{user.name}</h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-8">{user.role === 'admin' ? 'Администратор' : 'Пациент'}</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span className="text-sm font-bold text-slate-600">Записей</span>
                </div>
                <span className="font-black text-slate-900">{appointmentsCount}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-600">Статус</span>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">Активен</span>
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="w-full mt-10 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-3"
            >
              <LogOut className="w-5 h-5" />
              Выйти из аккаунта
            </button>
          </motion.div>

          <div className="bg-slate-950 p-10 rounded-[3rem] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
              <Activity className="w-32 h-32" />
            </div>
            <h3 className="text-xl font-black mb-4 relative z-10">Безопасность</h3>
            <p className="text-slate-400 text-sm leading-relaxed relative z-10">
              Ваши данные защищены современными методами шифрования. Мы никогда не передаем информацию третьим лицам.
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-100 shadow-sm"
          >
            <div className="flex items-center gap-4 mb-12">
              <div className="p-4 bg-teal-50 rounded-2xl">
                <User className="w-8 h-8 text-teal-600" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Личные данные</h3>
                <p className="text-slate-400 font-medium">Обновите информацию о себе</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Полное имя</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email (нельзя изменить)</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full pl-14 pr-6 py-4 bg-slate-100 border border-slate-100 rounded-2xl font-bold text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Телефон</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <h4 className="text-lg font-black text-slate-900 mb-6">Смена пароля</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Новый пароль</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        placeholder="Оставьте пустым, если не меняете"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Подтверждение</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        placeholder="Повторите новый пароль"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-teal-600 text-white rounded-[2rem] font-black text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-100 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Сохранить изменения
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
