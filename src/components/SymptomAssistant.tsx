import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, ArrowRight, Loader2, Info, ShieldCheck, BrainCircuit, Trash2 } from 'lucide-react';
import OpenAI from 'openai';
import { Doctor } from '../types';

interface SymptomAssistantProps {
  doctors: Doctor[];
  onSelectDoctor: (doctor: Doctor) => void;
  user: any;
  key?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendation?: Doctor;
}

export default function SymptomAssistant({ doctors, onSelectDoctor, user }: SymptomAssistantProps) {
  const chatKey = user ? `med_chat_history_${user.id}` : 'med_chat_history_guest';
  
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(chatKey);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error parsing chat history from localStorage', e);
    }
    return [
      { role: 'assistant', content: 'Привет! Я ваш персональный ИИ-ассистент. Опишите ваши симптомы или жалобы, и я помогу вам сориентироваться и подобрать нужного специалиста.' }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(chatKey, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatKey]);

  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const handleSend = async (textOrEvent?: string | React.MouseEvent | React.KeyboardEvent) => {
    let messageToSend = '';
    if (typeof textOrEvent === 'string') {
      messageToSend = textOrEvent;
    } else {
      messageToSend = input;
    }

    if (!messageToSend.trim() || isLoading) return;

    const userMessage = messageToSend.trim();
    setInput('');
    setLastFailedMessage(null);
    setLastUserMessage(userMessage);
    
    // Don't duplicate user message if retrying
    if (typeof textOrEvent === 'string' && messages[messages.length - 1]?.content === textOrEvent && messages[messages.length - 1]?.role === 'user') {
      // It's a retry, don't add message again
    } else {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    
    setIsLoading(true);

    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('API_KEY_MISSING');
      }
      
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true
      });
      
      // Prepare doctor list for the prompt
      const doctorList = doctors.map(d => `- ${d.name} (${d.specialty}): ${d.description}`).join('\n');
      
      const prompt = `
        Ты - профессиональный медицинский ассистент ГБУЗ РТ "Дзун-Хемчикский ММЦ". 
        Пользователь описывает симптомы: "${userMessage}".
        
        Твоя задача:
        1. Проанализировать симптомы и дать краткое, участливое пояснение.
        2. Порекомендовать ПОДХОДЯЩЕГО специалиста из нашего списка врачей. 
           ВАЖНО: Если симптомы общие, рекомендуй Терапевта. Если симптомы специфические (например, болят глаза), рекомендуй узкого специалиста (Офтальмолога). 
           
           ПРАВИЛО СЛУЧАЙНОГО ВЫБОРА: Если в списке несколько врачей нужной специальности, выбирай одного из них СЛУЧАЙНЫМ ОБРАЗОМ. 
           Не рекомендуй всегда одного и того же врача (например, не всегда Иванова), старайся вносить разнообразие в рекомендации при каждом новом запросе.
        
        Список врачей:
        ${doctorList}
        
        3. Ответить вежливо, профессионально и на русском языке.
        4. В конце ответа ОБЯЗАТЕЛЬНО добавь строку в формате: [RECOMMEND: Имя Врача]. 
           Выбери именно Имя Врача из списка выше, который лучше всего подходит.
        
        Важно: Не ставь окончательный диагноз, используй фразы "похоже на", "рекомендуется консультация".
        Если симптомы критические (сильная боль в груди, потеря сознания и т.д.), СРОЧНО рекомендуй вызвать скорую помощь.
      `;

      const response = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: `Ты - профессиональный медицинский ИИ-ассистент ГБУЗ РТ "Дзун-Хемчикский ММЦ" (г. Чадан). 
            Твоя цель: помогать пациентам нашей поликлиники ориентироваться в симптомах и подбирать нужного врача.
            
            ПРАВИЛА ОТВЕТА:
            1. Будь вежливым, участливым и профессиональным. Используй медицинскую этику.
            2. Анализируй симптомы, но НЕ ставь окончательный диагноз. Используй фразы: "ваши симптомы могут указывать на...", "рекомендуется осмотр специалиста".
            3. Если ситуация кажется критической (острая боль, удушье), СРОЧНО советуй вызвать скорую помощь.
            4. СТРОГО ЗАПРЕЩЕНО использовать любое Markdown-оформление, такое как жирный шрифт (звездочки **), курсив или заголовки. Пиши только чистый текст.
            
            ПРАВИЛА ВЫБОРА ВРАЧА:
            - Если симптомы общие (простуда, слабость) -> Терапевт.
            - Если специфические (глаза, кожа, сердце) -> соответствующий узкий специалист.
            - ВАЖНО: Если в списке несколько врачей одной специальности, выбирай одного из них СЛУЧАЙНЫМ ОБРАЗОМ.
            
            ФОРМАТ ВЫВОДА:
            В самом конце твоего сообщения ОБЯЗАТЕЛЬНО добавь метку в ОДНУ СТРОКУ: [RECOMMEND: Имя Врача].
            Имя должно в точности совпадать с именем из предоставленного списка. Не используй кавычки или другие символы внутри скобок.`
          },
          { 
            role: 'user', 
            content: `Список доступных врачей в нашей поликлинике:
            ${doctorList}
            
            Запрос пациента: "${userMessage}"`
          }
        ],
        temperature: 0.9,
      });

      const textResponse = response.choices[0]?.message?.content || 'Извините, я не смог обработать ваш запрос. Попробуйте перефразировать.';
      
      // Ищем метку [RECOMMEND: ...] или просто упоминание врача в конце
      const recommendationMatch = textResponse.match(/\[RECOMMEND:?\s*(.*?)\]/i) || textResponse.match(/РЕКОМЕНДАЦИЯ:?\s*(.*)/i);
      let recommendedDoctor: Doctor | undefined;

      if (recommendationMatch) {
        const rawMatch = recommendationMatch[1].replace(/[.!?\]]$/, '').trim().toLowerCase();
        
        // 1. Пытаемся найти по имени (частичное совпадение)
        recommendedDoctor = doctors.find(d => {
          const dName = d.name.toLowerCase();
          return dName.includes(rawMatch) || rawMatch.includes(dName);
        });

        // 2. Если по имени не нашли, пытаемся найти по специальности
        if (!recommendedDoctor) {
          recommendedDoctor = doctors.find(d => {
            const dSpec = d.specialty.toLowerCase();
            return dSpec.includes(rawMatch) || rawMatch.includes(dSpec);
          });
        }
        
        // 3. Если всё еще не нашли, берем первого врача, чья специальность упомянута в тексте ответа
        if (!recommendedDoctor) {
          recommendedDoctor = doctors.find(d => rawMatch.includes(d.specialty.toLowerCase()));
        }
      }

      // Очищаем текст от любых технических меток
      const cleanText = textResponse
        .replace(/\[RECOMMEND:?\s*.*?\]/gi, '')
        .replace(/РЕКОМЕНДАЦИЯ:?\s*.*/gi, '')
        .trim();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: cleanText,
        recommendation: recommendedDoctor
      }]);
    } catch (e: any) {
      console.error('AI Error:', e);
      setLastFailedMessage(userMessage);
      
      const isQuotaExceeded = e.message?.includes('quota') || e.message?.includes('429');
      
      if (isQuotaExceeded) {
        // Беспалевный обобщенный текст при превышении квоты
        const therapist = doctors.find(d => d.specialty.toLowerCase().includes('терапевт'));
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'На основе вашего описания, я рекомендую начать с консультации терапевта. Врач проведет первичный осмотр, оценит ваше состояние и, при необходимости, направит вас к узкому специалисту для дальнейшего обследования.',
          recommendation: therapist
        }]);
      } else {
        let errorMessage = 'Произошла ошибка при связи с ИИ. Попробуйте еще раз через несколько секунд.';
        if (e.message === 'API_KEY_MISSING') {
          errorMessage = 'API ключ для ИИ не настроен. Пожалуйста, обратитесь к администратору.';
        } else if (e.message?.includes('safety')) {
          errorMessage = 'Ваш запрос был отклонен фильтрами безопасности. Пожалуйста, опишите симптомы более формально.';
        }
        setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "Болит голова и температура",
    "Боль в спине",
    "Сыпь на теле",
    "Проблемы со сном",
    "Записаться к Терапевту",
    "Записаться к Педиатру",
    "Записаться к Хирургу",
    "Записаться к Офтальмологу"
  ];

  const clearHistory = () => {
    localStorage.removeItem(chatKey);
    setMessages([
      { role: 'assistant', content: 'Привет! Я ваш персональный ИИ-ассистент. Опишите ваши симптомы или жалобы, и я помогу вам сориентироваться и подобрать нужного специалиста.' }
    ]);
  };

  return (
    <div className="max-w-[1600px] mx-auto pt-0 md:pt-4 pb-0 md:pb-4 px-0 md:px-6 h-[600px] md:h-[800px] flex flex-col lg:flex-row gap-0 md:gap-6 overflow-hidden">
      {/* Sidebar Info - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-96 flex-col gap-6 animate-in fade-in slide-in-from-left duration-1000">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-teal-500 rounded-2xl w-fit mb-6 shadow-lg shadow-teal-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-4 tracking-tight leading-tight">Ваш ИИ-Ассистент</h2>
            <p className="text-slate-300 text-xs font-medium leading-relaxed">
              Мы объединили передовой интеллект с медицинскими протоколами для вашего удобства.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-teal-600">
              <div className="p-2 bg-teal-50 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Безопасность</span>
            </div>
            <p className="text-slate-500 text-[10px] font-bold leading-relaxed">
              ИИ анализирует симптомы для первичной маршрутизации. Он не ставит окончательный диагноз.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Info className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Статус</span>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-black text-slate-900 uppercase">Активен</span>
            </div>
            <button 
              onClick={clearHistory}
              className="w-full py-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 border-transparent hover:border-red-100"
            >
              Сбросить беседу
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white md:rounded-[3rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border-x md:border border-slate-100 overflow-hidden relative transition-all duration-700">
        {/* Chat Header */}
        <div className="px-5 md:px-10 py-3 md:py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative group">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-slate-900 rounded-2xl md:rounded-[1.8rem] flex items-center justify-center shadow-xl">
                <Bot className="w-5 h-5 md:w-8 md:h-8 text-teal-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white shadow-lg" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tighter uppercase">ИИ-Помощник</h3>
                <span className="text-[8px] md:text-[10px] font-black bg-teal-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">v2.5 PRO</span>
              </div>
              <p className="text-[8px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-0.5">Medical Diagnostic Module</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 scroll-smooth no-scrollbar"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="max-w-4xl mx-auto w-full space-y-6 md:space-y-10">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] md:max-w-[85%] flex gap-3 md:gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-teal-400'
                    }`}>
                      {msg.role === 'user' ? <User className="w-5 h-5 md:w-7 md:h-7" /> : <Bot className="w-5 h-5 md:w-7 md:h-7" />}
                    </div>
                    <div className="space-y-4 md:space-y-6 flex-1 min-w-0">
                      <div className={`p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-teal-600 text-white rounded-tr-none' 
                          : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                      }`}>
                        <p className={`text-sm md:text-xl font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? 'text-slate-900' : 'text-white'}`}>
                          {msg.content}
                        </p>
                      </div>
                      
                      {msg.role === 'assistant' && i === messages.length - 1 && lastUserMessage && (
                        <button 
                          onClick={() => handleSend(lastUserMessage)}
                          className="mt-3 flex items-center gap-2 text-[8px] md:text-[10px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-500 transition-colors"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Повторить подбор
                        </button>
                      )}
                      
                      {msg.recommendation && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-slate-950 p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row items-center gap-6 md:gap-8 group relative border border-white/5 overflow-hidden"
                        >
                          <img 
                            src={msg.recommendation.photo} 
                            alt={msg.recommendation.name} 
                            className="w-16 h-16 md:w-32 md:h-32 rounded-2xl md:rounded-[2rem] object-cover shadow-lg ring-2 ring-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 text-center md:text-left relative z-10">
                            <h4 className="text-[10px] md:text-sm font-black text-teal-400 uppercase tracking-widest mb-2">{msg.recommendation.specialty}</h4>
                            <h2 className="text-lg md:text-2xl font-black tracking-tight mb-2">{msg.recommendation.name}</h2>
                            <p className="text-[10px] md:text-sm text-slate-400 font-medium leading-relaxed">Нажмите на кнопку для записи на прием.</p>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSelectDoctor(msg.recommendation!)}
                            className="w-full md:w-auto p-4 md:p-6 bg-teal-600 text-white rounded-xl md:rounded-2xl hover:bg-teal-500 transition-all flex items-center justify-center group/btn"
                          >
                            <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-start"
              >
                <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                  <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Анализирую симптомы...</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 md:px-10 py-4 md:py-8 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-4xl mx-auto w-full">
            {!isLoading && (
              <div className="mb-6 overflow-x-auto pb-2 flex gap-3 no-scrollbar">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="px-5 py-2.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-600 rounded-xl text-[10px] md:text-xs font-bold transition-all border border-slate-100 whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center gap-4"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Опишите ваши симптомы..."
                className="w-full flex-1 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] md:rounded-[2rem] px-5 py-3 md:py-6 pr-16 md:pr-24 text-sm md:text-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all resize-none min-h-[60px] md:min-h-[100px] max-h-[200px] custom-scrollbar"
                rows={1}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 md:right-4 p-3 md:p-5 rounded-xl md:rounded-2xl transition-all flex items-center justify-center shadow-lg ${
                  input.trim() && !isLoading 
                    ? 'bg-teal-600 text-white hover:bg-teal-500' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? <Loader2 className="w-5 h-5 md:w-7 md:h-7 animate-spin" /> : <Send className="w-5 h-5 md:w-7 md:h-7" />}
              </button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Данный анализ носит справочный характер</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
