import { Activity, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Heart, Sparkles, ArrowUpRight, Github, Linkedin } from 'lucide-react';
import { motion } from 'motion/react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 pt-32 pb-12 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
      <div className="absolute -top-48 -right-48 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
      <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-32">
          {/* Brand Section */}
          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-[1.25rem] shadow-2xl shadow-teal-900/40">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-black text-white tracking-tight">ГБУЗ РТ "Дзун-Хемчикский ММЦ"</span>
            </div>
            <p className="text-lg leading-relaxed text-slate-400 font-medium max-w-2xl">
              Государственное бюджетное учреждение здравоохранения Республики Тыва "Дзун-Хемчикский межкожуунный медицинский центр". 
              Мы обеспечиваем качественную медицинскую помощь жителям нашего кожууна, используя современные технологии и опыт наших специалистов.
            </p>
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-4">
            <h4 className="text-white font-black uppercase tracking-[0.2em] text-xs mb-10">Свяжитесь с нами</h4>
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-[2.5rem] p-8 space-y-8">
              <div className="flex items-start gap-5">
                <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white font-black text-sm mb-1">Адрес</p>
                  <p className="text-slate-400 leading-relaxed">Республика Тыва, г. Чадан, <br />ул. Ленина, д. 45</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white font-black text-sm mb-1">Телефон</p>
                  <p className="text-slate-400">+7 (39433) 2-12-34</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white font-black text-sm mb-1">Email</p>
                  <p className="text-slate-400">dzun_mmc@mail.ru</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-8 text-sm font-bold text-slate-500">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <p>© {currentYear} ГБУЗ РТ "Дзун-Хемчикский ММЦ". Все права защищены.</p>
          </div>
          <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-900/50 rounded-full border border-slate-800">
            Сделано с <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" /> и <Sparkles className="w-4 h-4 text-amber-400" /> для вашего здоровья
          </div>
        </div>
      </div>
    </footer>
  );
}
