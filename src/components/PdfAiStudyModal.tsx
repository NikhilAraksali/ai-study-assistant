import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Topic, AiQuiz, AiFlashcardDeck } from '../types';
import { FormattedAiResponse } from './FormattedAiResponse';
import {
  FileText,
  X,
  Bot,
  Layers,
  BrainCircuit,
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Download,
  BookOpen,
  ExternalLink,
  RotateCw,
  Check
} from 'lucide-react';

interface PdfAiStudyModalProps {
  topic: Topic;
  onClose: () => void;
}

export const PdfAiStudyModal: React.FC<PdfAiStudyModalProps> = ({ topic, onClose }) => {
  const [activeMode, setActiveMode] = useState<'view' | 'chat' | 'flashcards' | 'quiz'>('view');
  const [docViewType, setDocViewType] = useState<'pdf' | 'text'>('pdf');

  // PDF Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // PDF Subtopics Extraction State
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [loadingTopics, setLoadingTopics] = useState(false);

  // PDF Flashcards Generator State
  const [cardCount, setCardCount] = useState(6);
  const [flashcardDeck, setFlashcardDeck] = useState<AiFlashcardDeck | null>(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // PDF Quiz Generator State
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [quiz, setQuiz] = useState<AiQuiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  const [chatError, setChatError] = useState<string | null>(null);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Load subtopics when switching to flashcards or quiz
  const loadSubtopics = async () => {
    if (subtopics.length > 0) return;
    setLoadingTopics(true);
    try {
      const res = await api.suggestPdfTopics(topic.id);
      setSubtopics(res.subtopics || []);
      if (res.subtopics?.length > 0) {
        setSelectedSubtopic(res.subtopics[0]);
      }
    } catch (err) {
      console.error('Failed loading subtopics:', err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query || chatLoading) return;

    setChatError(null);
    const userMsg = { role: 'user' as const, content: query };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    const modelMsgIndex = newHistory.length;
    setChatMessages([...newHistory, { role: 'model', content: '' }]);

    try {
      let accumulated = '';
      await api.streamPdfAi(
        topic.id,
        newHistory,
        chunk => {
          accumulated += chunk;
          setChatMessages(prev => {
            const next = [...prev];
            if (next[modelMsgIndex]) {
              next[modelMsgIndex] = { role: 'model', content: accumulated };
            }
            return next;
          });
        }
      );

      if (!accumulated.trim()) {
        setChatMessages(prev => {
          const next = [...prev];
          if (next[modelMsgIndex]) {
            next[modelMsgIndex] = { role: 'model', content: "I've reviewed the PDF document. Let me know what specific section you'd like me to explain." };
          }
          return next;
        });
      }
    } catch (err: any) {
      setChatError(err.message || 'Failed to get answer from PDF');
      setChatMessages(prev => {
        const next = [...prev];
        if (next[modelMsgIndex]) {
          next[modelMsgIndex] = { role: 'model', content: `⚠️ Error: ${err.message || 'Could not process PDF context.'}` };
        }
        return next;
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setFlashcardsLoading(true);
    setFlashcardError(null);
    setFlippedCards({});
    try {
      const res = await api.generatePdfFlashcards(topic.id, selectedSubtopic, cardCount);
      if (!res.deck || !res.deck.cards || res.deck.cards.length === 0) {
        throw new Error('Received empty flashcard deck from PDF.');
      }
      setFlashcardDeck(res.deck);
    } catch (err: any) {
      setFlashcardError(err.message || 'Failed generating flashcards from PDF');
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setQuizError(null);
    setSubmittedQuiz(false);
    setUserAnswers({});
    try {
      const res = await api.generatePdfQuiz(topic.id, selectedSubtopic, questionCount, quizDifficulty);
      if (!res.quiz || !res.quiz.questions || res.quiz.questions.length === 0) {
        throw new Error('Received empty quiz from PDF.');
      }
      setQuiz(res.quiz);
    } catch (err: any) {
      setQuizError(err.message || 'Failed generating quiz from PDF');
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#111113] border border-[#242428] rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#161618] border-b border-[#242428] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#111113] border border-[#242428] flex items-center justify-center text-[#5B8CFF]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#F5F5F5] truncate max-w-md">{topic.title}</h2>
              <p className="text-xs text-[#71717A]">Posted by {topic.teacherName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#111113] text-[#71717A] hover:text-[#F5F5F5] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Navigation Tabs */}
        <div className="px-6 bg-[#161618] border-b border-[#242428] flex items-center space-x-2 overflow-x-auto text-xs font-medium py-2 shrink-0">
          <button
            onClick={() => setActiveMode('view')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shrink-0 ${
              activeMode === 'view'
                ? 'bg-[#111113] text-[#5B8CFF] border border-[#242428]'
                : 'text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>View Document</span>
          </button>

          <button
            onClick={() => setActiveMode('chat')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shrink-0 ${
              activeMode === 'chat'
                ? 'bg-[#111113] text-[#5B8CFF] border border-[#242428]'
                : 'text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask AI About PDF</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('flashcards');
              loadSubtopics();
            }}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shrink-0 ${
              activeMode === 'flashcards'
                ? 'bg-[#111113] text-[#8B7CFF] border border-[#242428]'
                : 'text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Generate Flashcards</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('quiz');
              loadSubtopics();
            }}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shrink-0 ${
              activeMode === 'quiz'
                ? 'bg-[#111113] text-[#65D6B0] border border-[#242428]'
                : 'text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Generate Quiz</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B0B0C]">

          {/* MODE 1: VIEW PDF DOCUMENT */}
          {activeMode === 'view' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717A] pb-2 border-b border-[#242428]">
                <div className="flex items-center space-x-2">
                  {topic.attachmentUrl && (
                    <button
                      onClick={() => setDocViewType('pdf')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                        docViewType === 'pdf'
                          ? 'bg-[#161618] text-[#5B8CFF] border border-[#242428]'
                          : 'text-[#71717A] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <span>PDF Embedded View</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDocViewType('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                      docViewType === 'text' || !topic.attachmentUrl
                        ? 'bg-[#161618] text-[#5B8CFF] border border-[#242428]'
                        : 'text-[#71717A] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <span>Extracted Text & Notes</span>
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  {topic.attachmentUrl && (
                    <a
                      href={topic.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-[#161618] text-[#5B8CFF] rounded-lg font-semibold hover:bg-[#242428] transition border border-[#242428]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </a>
                  )}
                  {topic.attachmentUrl && (
                    <a
                      href={topic.attachmentUrl}
                      download
                      className="inline-flex items-center space-x-1 text-[#A1A1AA] hover:text-[#F5F5F5] font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>

              {docViewType === 'pdf' && topic.attachmentUrl ? (
                <div className="w-full h-[65vh] rounded-xl border border-[#242428] bg-[#111113] overflow-hidden relative">
                  <object
                    data={topic.attachmentUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <iframe
                      src={topic.attachmentUrl}
                      className="w-full h-full border-none"
                      title="PDF Document Viewer"
                    />
                    <div className="p-8 text-center space-y-4 my-auto">
                      <FileText className="w-12 h-12 text-[#5B8CFF] mx-auto" />
                      <p className="text-sm font-semibold text-[#F5F5F5]">In-browser PDF plugin rendering is restricted in your current frame.</p>
                      <div className="flex items-center justify-center space-x-3">
                        <a
                          href={topic.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-[#5B8CFF] text-white rounded-xl text-xs font-semibold shadow-sm"
                        >
                          Open PDF in New Browser Tab ↗
                        </a>
                        <button
                          onClick={() => setDocViewType('text')}
                          className="px-4 py-2 bg-[#161618] text-[#F5F5F5] rounded-xl text-xs font-semibold border border-[#242428]"
                        >
                          Switch to Extracted Text View
                        </button>
                      </div>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#111113] border border-[#242428] max-h-[65vh] overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#242428]">
                    <h3 className="text-xs font-mono font-semibold text-[#5B8CFF] uppercase tracking-wider">
                      {topic.title} — Extracted Document Content
                    </h3>
                  </div>
                  <div className="text-xs sm:text-sm text-[#A1A1AA] whitespace-pre-line leading-relaxed font-mono">
                    {topic.pdfText || topic.content || 'No text content available.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: ASK AI ABOUT THIS PDF */}
          {activeMode === 'chat' && (
            <div className="h-full flex flex-col justify-between space-y-4">
              {chatError && (
                <div className="p-3 bg-[#F47C7C]/10 border border-[#F47C7C]/30 text-[#F47C7C] text-xs rounded-xl">
                  {chatError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#111113] border border-[#242428] text-center space-y-3 my-8">
                    <Sparkles className="w-8 h-8 mx-auto text-[#5B8CFF]" />
                    <h3 className="text-base font-semibold text-[#F5F5F5]">Ask Questions Grounded in this PDF</h3>
                    <p className="text-xs text-[#71717A] max-w-md mx-auto">
                      Our AI has indexed the contents of "{topic.title}". Ask anything about formulas, theorems, definitions, or summaries!
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#18181B] border border-[#242428] text-[#F5F5F5]'
                            : 'bg-[#161618] border border-[#242428] text-[#A1A1AA]'
                        }`}
                      >
                        <FormattedAiResponse content={msg.content} isUser={msg.role === 'user'} />
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="text-xs text-[#71717A] font-mono italic animate-pulse">
                    ScholarAI is reading PDF and generating answer...
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChatMessage} className="flex space-x-2 pt-2">
                <input
                  type="text"
                  placeholder="Ask a question about this PDF..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#111113] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* MODE 3: GENERATE FLASHCARDS FROM PDF */}
          {activeMode === 'flashcards' && (
            <div className="space-y-6">
              {flashcardError && (
                <div className="p-3 bg-[#F47C7C]/10 border border-[#F47C7C]/30 text-[#F47C7C] text-xs rounded-xl">
                  {flashcardError}
                </div>
              )}
              {!flashcardDeck ? (
                <div className="bento-card p-6 space-y-4">
                  <h3 className="text-base font-semibold text-[#F5F5F5]">Generate Flashcards from PDF Chapters</h3>

                  {loadingTopics ? (
                    <p className="text-xs text-[#71717A] font-mono animate-pulse">Extracting chapter topics from PDF...</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Select Chapter / Subtopic</label>
                        <select
                          value={selectedSubtopic}
                          onChange={e => setSelectedSubtopic(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                        >
                          <option value="">Full PDF Document Overview</option>
                          {subtopics.map((st, i) => (
                            <option key={i} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Number of Cards</label>
                        <select
                          value={cardCount}
                          onChange={e => setCardCount(parseInt(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                        >
                          <option value={4}>4 Cards</option>
                          <option value={6}>6 Cards</option>
                          <option value={10}>10 Cards</option>
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateFlashcards}
                        disabled={flashcardsLoading}
                        className="w-full py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 flex items-center justify-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                      >
                        <Layers className="w-4 h-4" />
                        <span>{flashcardsLoading ? 'Generating Flashcards...' : 'Generate Flashcards'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#F5F5F5]">{flashcardDeck.topic}</h3>
                    <button
                      onClick={() => setFlashcardDeck(null)}
                      className="text-xs text-[#5B8CFF] hover:underline font-semibold"
                    >
                      + Generate New Deck
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {flashcardDeck.cards.map((c, i) => {
                      const isFlipped = flippedCards[c.id];
                      return (
                        <div
                          key={c.id}
                          onClick={() => setFlippedCards(prev => ({ ...prev, [c.id]: !isFlipped }))}
                          className={`p-5 rounded-2xl border transition cursor-pointer min-h-[160px] flex flex-col justify-between select-none ${
                            isFlipped
                              ? 'bg-[#161618] border-[#8B7CFF]/50 text-[#F5F5F5]'
                              : 'bg-[#111113] border-[#242428] text-[#F5F5F5] hover:border-[#383840]'
                          }`}
                        >
                          <span className="text-[10px] font-mono font-semibold text-[#71717A] uppercase tracking-wider">
                            {isFlipped ? 'Answer (Back)' : `Card ${i + 1} (Front - Tap to Flip)`}
                          </span>
                          <p className="text-xs sm:text-sm font-medium mt-2 leading-relaxed">
                            {isFlipped ? c.back : c.front}
                          </p>
                          <span className="text-[10px] font-mono text-[#8B7CFF] mt-2 flex items-center space-x-1">
                            <RotateCw className="w-3 h-3" />
                            <span>{isFlipped ? 'Tap to view Question' : 'Tap to view Answer'}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 4: GENERATE QUIZ FROM PDF */}
          {activeMode === 'quiz' && (
            <div className="space-y-6">
              {quizError && (
                <div className="p-3 bg-[#F47C7C]/10 border border-[#F47C7C]/30 text-[#F47C7C] text-xs rounded-xl">
                  {quizError}
                </div>
              )}
              {!quiz ? (
                <div className="bento-card p-6 space-y-4">
                  <h3 className="text-base font-semibold text-[#F5F5F5]">Generate AI Quiz Grounded in PDF</h3>

                  {loadingTopics ? (
                    <p className="text-xs text-[#71717A] font-mono animate-pulse">Extracting topics from PDF...</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Select Chapter / Subtopic</label>
                        <select
                          value={selectedSubtopic}
                          onChange={e => setSelectedSubtopic(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                        >
                          <option value="">Full PDF Overview</option>
                          {subtopics.map((st, i) => (
                            <option key={i} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Difficulty</label>
                          <select
                            value={quizDifficulty}
                            onChange={e => setQuizDifficulty(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Questions</label>
                          <select
                            value={questionCount}
                            onChange={e => setQuestionCount(parseInt(e.target.value))}
                            className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                          >
                            <option value={3}>3 Questions</option>
                            <option value={5}>5 Questions</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateQuiz}
                        disabled={quizLoading}
                        className="w-full py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 flex items-center justify-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>{quizLoading ? 'Generating Quiz...' : 'Generate AI Quiz'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#F5F5F5]">{quiz.subject}</h3>
                    <button
                      onClick={() => setQuiz(null)}
                      className="text-xs text-[#5B8CFF] hover:underline font-semibold"
                    >
                      + New Quiz
                    </button>
                  </div>

                  {quiz.questions.map((q, qIdx) => {
                    const selectedOpt = userAnswers[qIdx];
                    const hasAnswered = selectedOpt !== undefined;
                    const isCorrect = selectedOpt === q.answerIndex;

                    return (
                      <div key={qIdx} className="bento-card p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#71717A]">
                          <span className="font-mono font-bold text-[#5B8CFF]">Question {qIdx + 1}</span>
                          {hasAnswered && (
                            <span className={`font-mono text-xs font-semibold flex items-center space-x-1 ${isCorrect ? 'text-[#65D6B0]' : 'text-[#F47C7C]'}`}>
                              {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              <span>{isCorrect ? 'Correct!' : 'Incorrect'}</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">{q.question}</h4>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isOptionSelected = selectedOpt === optIdx;
                            const isOptionCorrect = optIdx === q.answerIndex;

                            let optionStyle = 'bg-[#161618] border-[#242428] text-[#A1A1AA] hover:border-[#383840] hover:text-[#F5F5F5]';

                            if (hasAnswered) {
                              if (isOptionCorrect) {
                                optionStyle = 'bg-[#65D6B0]/10 border-[#65D6B0]/40 text-[#65D6B0] font-semibold';
                              } else if (isOptionSelected && !isCorrect) {
                                optionStyle = 'bg-[#F47C7C]/10 border-[#F47C7C]/40 text-[#F47C7C] font-semibold';
                              } else {
                                optionStyle = 'bg-[#161618] border-[#242428] text-[#71717A] opacity-50';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${optionStyle}`}
                              >
                                <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                {hasAnswered && isOptionCorrect && (
                                  <Check className="w-4 h-4 text-[#65D6B0]" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {hasAnswered && q.explanation && (
                          <div className="p-3 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#A1A1AA] leading-relaxed">
                            <strong className="text-[#5B8CFF] font-mono">AI Concept Note:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
