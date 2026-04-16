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
    <div className="max-w-5xl mx-auto py-6 md:py-12 px-2 md:px-4 h-[calc(100vh-140px)] md:h-[800px] flex flex-col lg:flex-row gap-4 md:gap-8">
      {/* Sidebar Info - Hidden on mobile, shown in a toggle or at bottom */}
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
      <div className="flex-1 flex flex-col bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
        {/* Chat Header */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
                <Bot className="w-8 h-8 text-teal-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">ИИ-Ассистент ММЦ</h3>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">AI Diagnostics Support</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[95%] md:max-w-[85%] flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-teal-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <div className="space-y-4">
                    <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl ${
                      msg.role === 'user' 
                        ? 'bg-teal-600 text-white rounded-tr-none shadow-teal-100' 
                        : 'bg-white text-slate-700 border border-slate-50 rounded-tl-none shadow-slate-100'
                    }`}>
                      <p className="text-sm md:text-base font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === 'assistant' && lastFailedMessage && i === messages.length - 1 && (
                        <button 
                          onClick={() => handleSend(lastFailedMessage)}
                          className="mt-4 flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-700 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Попробовать снова
                        </button>
                      )}
                    </div>
                    
                    {msg.recommendation && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5 }}
                        className="bg-slate-900 p-4 md:p-6 rounded-[1.8rem] md:rounded-[2rem] text-white shadow-2xl flex items-center gap-4 md:gap-6 group"
                      >
                        <img 
                          src={msg.recommendation.photo} 
                          alt={msg.recommendation.name} 
                          className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover shadow-lg border-2 border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] md:text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1 truncate">{msg.recommendation.specialty}</p>
                          <p className="text-sm md:text-lg font-black tracking-tight truncate">{msg.recommendation.name}</p>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onSelectDoctor(msg.recommendation!)}
                          className="p-3 md:p-4 bg-teal-600 text-white rounded-xl md:rounded-2xl hover:bg-teal-500 transition-all shadow-xl shadow-teal-900/40"
                        >
                          <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-slate-50 flex items-center gap-3 md:gap-4">
                <div className="relative">
                  <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-teal-600" />
                  <div className="absolute inset-0 blur-md bg-teal-400/20 animate-pulse" />
                </div>
                <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-widest">Анализ симптомов...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-slate-50/50 border-t border-slate-100">
          {messages.length === 1 && !isLoading && (
            <div className="mb-4 md:mb-8 flex flex-wrap gap-2 md:gap-3 justify-center">
              {quickQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend(q)}
                  className="px-4 md:px-6 py-2 md:py-3 bg-white border border-slate-100 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          )}
          <div className="relative flex items-center max-w-4xl mx-auto">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={window.innerWidth < 768 ? "Опишите жалобы..." : "Опишите ваши симптомы..."}
              className="w-full pl-6 md:pl-8 pr-16 md:pr-20 py-4 md:py-6 bg-white border-2 border-transparent focus:border-teal-500 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl outline-none transition-all font-bold text-sm md:text-base text-slate-900 placeholder:text-slate-300"
            />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 md:right-3 p-3 md:p-4 bg-slate-900 text-white rounded-xl md:rounded-2xl hover:bg-teal-600 disabled:opacity-50 transition-all shadow-xl"
            >
              <Send className="w-5 h-5 md:w-6 md:h-6" />
            </motion.button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:gap-6 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Конфиденциально</span>
            <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Не диагноз</span>
          </div>
        </div>
      </div>
    </div>
  );
}
