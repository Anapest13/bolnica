import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, ArrowRight, Loader2, Info, ShieldCheck, BrainCircuit } from 'lucide-react';
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
    "Боль в спине после тренировки",
    "Сыпь на руках",
    "Проблемы со сном"
  ];

  const clearHistory = () => {
    localStorage.removeItem(chatKey);
    setMessages([
      { role: 'assistant', content: 'Привет! Я ваш персональный ИИ-ассистент. Опишите ваши симптомы или жалобы, и я помогу вам сориентироваться и подобрать нужного специалиста.' }
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto pt-0 md:pt-12 pb-0 md:pb-2 px-0 md:px-4 h-full md:h-[850px] flex flex-col lg:flex-row gap-0 md:gap-8 overflow-hidden">
      {/* Sidebar Info - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-80 flex-col gap-6">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-teal-500 rounded-2xl w-fit mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-4 tracking-tight leading-tight">Интеллектуальный помощник</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Используйте мощь искусственного интеллекта для предварительного анализа симптомов.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-teal-600">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-black uppercase tracking-widest text-xs">Безопасность</span>
          </div>
          <p className="text-slate-500 text-xs font-bold leading-relaxed">
            Ваши данные конфиденциальны. ИИ помогает направить вас к нужному врачу, но не заменяет очную консультацию специалиста.
          </p>
          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Статус системы</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-slate-900">DeepSeek Chat Online</span>
            </div>
            <button 
              onClick={clearHistory}
              className="w-full py-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-100"
            >
              Очистить историю
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white md:rounded-[3rem] shadow-2xl border-x md:border border-slate-100 overflow-hidden relative">
        {/* Chat Header */}
        <div className="px-3 md:px-8 py-2 md:py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <div className="w-8 h-8 md:w-14 md:h-14 bg-slate-900 rounded-lg md:rounded-2xl flex items-center justify-center shadow-xl">
                <Bot className="w-4 h-4 md:w-8 md:h-8 text-teal-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="text-sm md:text-xl font-black text-slate-900 tracking-tight">ИИ-Ассистент</h3>
              <p className="text-[7px] md:text-[10px] font-black text-teal-600 uppercase tracking-widest">AI Diagnostics Support</p>
            </div>
          </div>
          <button 
            onClick={clearHistory}
            className="lg:hidden p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Очистить историю"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-3 md:p-8 space-y-4 md:space-y-8 scroll-smooth no-scrollbar"
          style={{ overscrollBehavior: 'contain' }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[80%] flex gap-2 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-teal-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5 md:w-5 md:h-5" /> : <Bot className="w-3.5 h-3.5 md:w-5 md:h-5" />}
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <div className={`p-3 md:p-6 rounded-[1rem] md:rounded-[2rem] shadow-lg ${
                      msg.role === 'user' 
                        ? 'bg-teal-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-50 rounded-tl-none shadow-slate-100'
                    }`}>
                      <p className="text-xs md:text-base font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === 'assistant' && lastFailedMessage && i === messages.length - 1 && (
                        <button 
                          onClick={() => handleSend(lastFailedMessage)}
                          className="mt-3 flex items-center gap-2 text-[8px] md:text-[10px] font-black text-teal-600 uppercase tracking-widest"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Попробовать снова
                        </button>
                      )}
                    </div>
                    
                    {msg.recommendation && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 p-3 md:p-6 rounded-[1.2rem] md:rounded-[2rem] text-white shadow-2xl flex items-center gap-3 md:gap-6 group"
                      >
                        <img 
                          src={msg.recommendation.photo} 
                          alt={msg.recommendation.name} 
                          className="w-9 h-9 md:w-16 md:h-16 rounded-lg md:rounded-2xl object-cover shadow-lg border-2 border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[6px] md:text-[10px] font-black text-teal-400 uppercase tracking-widest mb-0.5 truncate">{msg.recommendation.specialty}</p>
                          <p className="text-[10px] md:text-lg font-black tracking-tight truncate">{msg.recommendation.name}</p>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onSelectDoctor(msg.recommendation!)}
                          className="p-1.5 md:p-4 bg-teal-600 text-white rounded-lg md:rounded-2xl hover:bg-teal-500 transition-all shadow-xl shadow-teal-900/40"
                        >
                          <ArrowRight className="w-3.5 h-3.5 md:w-6 md:h-6" />
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
              <div className="bg-white p-2.5 md:p-6 rounded-[1rem] md:rounded-[2rem] shadow-md border border-slate-50 flex items-center gap-2 md:gap-4">
                <Loader2 className="w-3.5 h-3.5 md:w-6 md:h-6 animate-spin text-teal-600" />
                <span className="text-[8px] md:text-sm font-black text-slate-500 uppercase tracking-widest">Анализирую...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-2 md:p-8 bg-slate-50/50 border-t border-slate-100 shrink-0">
          {messages.length === 1 && !isLoading && (
            <div className="mb-2 overflow-x-auto pb-1 flex gap-2 no-scrollbar">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[9px] whitespace-nowrap font-black text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex items-center max-w-4xl mx-auto">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Опишите ваши симптомы..."
              className="w-full pl-4 md:pl-8 pr-12 md:pr-20 py-3 md:py-6 bg-white border-2 border-transparent focus:border-teal-500 rounded-xl md:rounded-[2rem] shadow-xl outline-none transition-all font-bold text-xs md:text-base text-slate-900 placeholder:text-slate-300"
            />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 md:right-3 p-2 md:p-4 bg-slate-900 text-white rounded-lg md:rounded-2xl hover:bg-teal-600 disabled:opacity-50 transition-all shadow-xl"
            >
              <Send className="w-4 h-4 md:w-6 md:h-6" />
            </motion.button>
          </div>
          <div className="mt-2.5 md:mt-4 flex items-center justify-center gap-4 md:gap-6 text-[6px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Конфиденциально</span>
            <span className="flex items-center gap-1"><Info className="w-2.5 h-2.5" /> Не диагноз</span>
          </div>
        </div>
      </div>
    </div>
  );
}
