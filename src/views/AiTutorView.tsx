import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { ChatMessage } from '../types';
import { 
  Bot, 
  Send, 
  User, 
  RefreshCw, 
  StopCircle, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Code2, 
  GraduationCap, 
  Lightbulb, 
  Zap, 
  FileText,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FormattedAiResponse } from '../components/FormattedAiResponse';

type TutorMode = 'general' | 'socratic' | 'coder' | 'exam' | 'eli5';
type DeliveryMode = 'stream' | 'direct';

interface ModeOption {
  id: TutorMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeOption[] = [
  { id: 'general', label: 'General Tutor', desc: 'Comprehensive, structured explanations', icon: Sparkles },
  { id: 'socratic', label: 'Socratic Guide', desc: 'Interactive step-by-step guided thinking', icon: Lightbulb },
  { id: 'coder', label: 'Code & CS Expert', desc: 'Syntax, Big-O complexity & runnable code', icon: Code2 },
  { id: 'exam', label: 'Exam Review', desc: 'High-yield flash summaries & key formulas', icon: GraduationCap },
  { id: 'eli5', label: 'ELI5 Simplified', desc: 'Intuitive analogies with zero jargon', icon: Zap }
];

const PROMPT_CHIPS_BY_MODE: Record<TutorMode, string[]> = {
  general: [
    'What is DBMS & Normalization?',
    'Explain ACID properties in simple words',
    'Explain Primary Key vs Foreign Key',
    'How do neural networks learn?'
  ],
  socratic: [
    'Help me understand Binary Search step by step',
    'Why do we need database indexing?',
    'Guide me through solving Recursion',
    'Why is HTTPS more secure than HTTP?'
  ],
  coder: [
    'Write a SQL query for student ranking with RANK()',
    'Implement a LRU Cache in Python with O(1) time',
    'Compare BFS vs DFS with code implementation',
    'Write a debounced search hook in React TypeScript'
  ],
  exam: [
    'Summarize OS Process Scheduling algorithms for exams',
    'Top 5 viva questions on Object Oriented Programming',
    'Key differences between TCP and UDP with formulas',
    'Database transactions isolation levels cheat sheet'
  ],
  eli5: [
    'Explain how the Internet works like a postal service',
    'What is a CPU cache explained with a kitchen analogy',
    'How does encryption work like a padlock box?',
    'Explain API endpoints like a restaurant waiter'
  ]
};

const DEFAULT_WELCOME = "Hello! I am your ScholarAI Study Tutor. What concept, subject, or code challenge would you like help understanding today?";
const STORAGE_KEY = 'scholarai_tutor_chat_history_v2';

export const AiTutorView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      {
        id: 'msg_0',
        role: 'model',
        content: DEFAULT_WELCOME,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<TutorMode>('general');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('stream');
  const [showSettings, setShowSettings] = useState(false);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Audio output state (TTS)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recog;
    }
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(loading ? 'auto' : 'smooth');
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner voice reading
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[#*`_~]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExportChat = () => {
    const markdown = messages
      .map(m => `### ${m.role === 'user' ? 'Student' : 'ScholarAI Tutor'} (${m.timestamp})\n\n${m.content}\n\n---`)
      .join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScholarAI-Tutor-Session-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading || isSubmittingRef.current) return;

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    isSubmittingRef.current = true;
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: userTimestamp
    };

    const aiMsgId = `ai_${Date.now()}`;
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Placeholder message for output
    const placeholderMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...newHistory, placeholderMsg]);

    try {
      const apiHistory = newHistory.map(m => ({ role: m.role, content: m.content }));
      
      if (deliveryMode === 'stream') {
        let accumulated = '';
        try {
          await api.streamAiTutor(
            apiHistory,
            chunk => {
              accumulated += chunk;
              setMessages(prev =>
                prev.map(m => (m.id === aiMsgId ? { ...m, content: accumulated } : m))
              );
            },
            activeMode,
            controller.signal
          );
        } catch (streamErr: any) {
          if (streamErr.name === 'AbortError') return;
          console.warn('Stream delivery note, fetching complete response:', streamErr);
        }

        // If stream ended with empty text, query direct endpoint
        if (!accumulated.trim()) {
          const directRes = await api.askAiTutor(apiHistory, activeMode, controller.signal);
          const replyText = directRes?.reply || "I've reviewed your question. Please let me know what specific topic you'd like to explore.";
          setMessages(prev =>
            prev.map(m => (m.id === aiMsgId ? { ...m, content: replyText } : m))
          );
        }
      } else {
        // Direct buffered delivery mode
        const directRes = await api.askAiTutor(apiHistory, activeMode, controller.signal);
        const replyText = directRes?.reply || "I've reviewed your question. Please let me know what specific topic you'd like to explore.";
        setMessages(prev =>
          prev.map(m => (m.id === aiMsgId ? { ...m, content: replyText } : m))
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('AI chat error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                content: `⚠️ Sorry, I encountered an issue: ${err.message || 'AI service temporarily busy. Please try asking again.'}`
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const handleClear = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setLoading(false);
    isSubmittingRef.current = false;
    const initialMsg: ChatMessage = {
      id: 'msg_0',
      role: 'model',
      content: DEFAULT_WELCOME,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  const activeModeConfig = MODES.find(m => m.id === activeMode) || MODES[0];
  const promptChips = PROMPT_CHIPS_BY_MODE[activeMode] || PROMPT_CHIPS_BY_MODE.general;

  // Derive smart follow-ups from the latest AI reply
  const lastModelMsg = messages.filter(m => m.role === 'model' && m.content.length > 50).slice(-1)[0];
  const followUpSuggestions = [
    'Can you give me a concrete example?',
    'Give me a practice quiz question on this',
    'What are the most common student mistakes?'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Bento Header */}
      <div className="bento-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF] shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold text-[#F5F5F5]">AI Study Tutor</h1>
              <span className="text-[10px] font-mono text-[#65D6B0] px-2 py-0.5 rounded bg-[#65D6B0]/10 border border-[#65D6B0]/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#65D6B0] animate-pulse" />
                <span>{deliveryMode === 'stream' ? 'Live Stream' : 'Instant Answer'}</span>
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">
              Active Mode: <span className="text-[#5B8CFF] font-medium">{activeModeConfig.label}</span> — {activeModeConfig.desc}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 text-xs font-medium border ${
              showSettings 
                ? 'bg-[#5B8CFF]/10 border-[#5B8CFF]/30 text-[#5B8CFF]' 
                : 'bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F5] border-[#242428]'
            }`}
            title="Tutor Modes & Delivery Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tutor Modes</span>
          </button>

          {messages.length > 1 && (
            <button
              onClick={handleExportChat}
              className="px-3 py-1.5 rounded-xl bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F5] transition flex items-center space-x-1.5 text-xs font-medium border border-[#242428]"
              title="Download Conversation as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-[#161618] text-[#A1A1AA] hover:text-[#F5F5F5] transition flex items-center space-x-1.5 text-xs font-medium border border-[#242428]"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Mode & Engine Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bento-card p-4 sm:p-5 space-y-4 border border-[#5B8CFF]/20 bg-[#111113]">
              <div>
                <label className="text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider block mb-2">
                  Select Study Persona
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MODES.map(m => {
                    const Icon = m.icon;
                    const isSelected = activeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveMode(m.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 ${
                          isSelected
                            ? 'bg-[#5B8CFF]/10 border-[#5B8CFF] text-[#F5F5F5]'
                            : 'bg-[#161618] border-[#242428] text-[#A1A1AA] hover:border-[#38383F] hover:text-[#F5F5F5]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#5B8CFF]' : 'text-[#71717A]'}`} />
                          <span className="text-xs font-medium">{m.label}</span>
                        </div>
                        <p className="text-[10px] text-[#71717A] line-clamp-2 leading-tight">
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Speed Engine */}
              <div className="pt-3 border-t border-[#242428] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-[#F5F5F5]">Response Engine</span>
                  <p className="text-[11px] text-[#71717A]">Choose how responses are delivered to your browser</p>
                </div>
                <div className="inline-flex rounded-xl bg-[#161618] p-1 border border-[#242428]">
                  <button
                    onClick={() => setDeliveryMode('stream')}
                    className={`px-3 py-1 text-xs rounded-lg transition flex items-center space-x-1.5 ${
                      deliveryMode === 'stream'
                        ? 'bg-[#5B8CFF] text-white font-medium shadow-sm'
                        : 'text-[#71717A] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>Real-Time Stream</span>
                  </button>
                  <button
                    onClick={() => setDeliveryMode('direct')}
                    className={`px-3 py-1 text-xs rounded-lg transition flex items-center space-x-1.5 ${
                      deliveryMode === 'direct'
                        ? 'bg-[#5B8CFF] text-white font-medium shadow-sm'
                        : 'text-[#71717A] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Full Answer (Buffered)</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Starter Chips */}
      <div className="flex flex-wrap gap-2">
        {promptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-[#111113] border border-[#242428] text-xs font-medium text-[#A1A1AA] hover:text-[#5B8CFF] hover:border-[#5B8CFF]/40 transition disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Messages Bento Container */}
      <div className="bento-card p-4 sm:p-6 min-h-[420px] max-h-[600px] overflow-y-auto space-y-4">
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            const isLatestAiStreaming = !isUser && loading && msg.id === messages[messages.length - 1]?.id;

            // Don't render empty placeholder if no content yet and loading
            if (!isUser && !msg.content && !isLatestAiStreaming) return null;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF] shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm shadow-md ${
                    isUser
                      ? 'bg-[#18181B] border border-[#242428] text-[#F5F5F5]'
                      : 'bg-[#161618] border border-[#242428] text-[#A1A1AA]'
                  }`}
                >
                  {/* Card Header & Controls */}
                  <div className="flex items-center justify-between space-x-4 mb-2 pb-1.5 border-b border-[#242428]/60">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                        {isUser ? 'You' : 'ScholarAI Tutor'}
                      </span>
                      {!isUser && (
                        <span className="text-[9px] font-mono text-[#5B8CFF] px-1.5 py-0.2 rounded bg-[#5B8CFF]/10">
                          {activeModeConfig.label}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[9px] text-[#71717A]">{msg.timestamp}</span>

                      {!isUser && msg.content && (
                        <>
                          <button
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            className="p-1 rounded text-[#71717A] hover:text-[#5B8CFF] transition"
                            title={speakingMsgId === msg.id ? 'Stop audio' : 'Read aloud'}
                          >
                            {speakingMsgId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5 text-[#5B8CFF]" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 rounded text-[#71717A] hover:text-[#F5F5F5] transition"
                            title="Copy answer"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-[#65D6B0]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  {msg.content ? (
                    <FormattedAiResponse content={msg.content} isUser={isUser} />
                  ) : (
                    <div className="flex items-center space-x-2 py-2 text-xs text-[#71717A] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] animate-bounce [animation-delay:0.4s]" />
                      <span className="pl-1">Synthesizing explanation...</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#18181B] border border-[#242428] flex items-center justify-center text-[#A1A1AA] shrink-0 mt-0.5 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Suggested Next Questions */}
        {!loading && lastModelMsg && (
          <div className="pt-2">
            <div className="flex items-center space-x-1.5 text-[11px] text-[#71717A] mb-2 font-mono">
              <ArrowRight className="w-3 h-3 text-[#5B8CFF]" />
              <span>Suggested Next Steps:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {followUpSuggestions.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => handleSend(sug)}
                  className="px-2.5 py-1 rounded-lg bg-[#161618] border border-[#242428] text-[11px] text-[#A1A1AA] hover:text-[#5B8CFF] hover:border-[#5B8CFF]/30 transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="bento-card p-2 flex items-center space-x-2"
      >
        {speechSupported && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-2.5 rounded-xl transition ${
              isListening
                ? 'bg-[#F47C7C] text-white animate-pulse'
                : 'bg-[#161618] border border-[#242428] text-[#A1A1AA] hover:text-[#5B8CFF]'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Voice Input (Dictate question)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <input
          type="text"
          placeholder={isListening ? 'Listening to your voice...' : `Ask anything (${activeModeConfig.label} mode active)...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-transparent text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none"
        />

        {loading ? (
          <button
            type="button"
            onClick={handleStop}
            className="p-2.5 bg-[#242428] hover:bg-[#323238] text-[#F47C7C] rounded-xl transition flex items-center space-x-1 text-xs font-semibold px-3"
            title="Stop streaming"
          >
            <StopCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white rounded-xl transition disabled:opacity-30 disabled:hover:bg-[#5B8CFF]"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
};
