import React, { useState } from 'react';
import { api } from '../services/api';
import { AiQuiz } from '../types';
import { BrainCircuit, CheckCircle2, XCircle, Award, RotateCcw, ArrowRight, HelpCircle, Check, RotateCw, AlertCircle } from 'lucide-react';

export const AiQuizView: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<AiQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSubmitted(false);
    setUserAnswers({});
    setScore(null);

    try {
      const res = await api.generateQuiz({ subject: subject.trim(), difficulty, questionCount });
      if (!res.quiz || !res.quiz.questions || res.quiz.questions.length === 0) {
        throw new Error('Received empty quiz from AI. Please try again with a more specific subject.');
      }
      setActiveQuiz(res.quiz);
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qIndex: number, optionIdx: number) => {
    if (submitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qIndex]: optionIdx
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    let correctCount = 0;

    activeQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answerIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / activeQuiz.questions.length) * 100);
    setScore(calculatedScore);
    setSubmitted(true);

    try {
      const answerArray = activeQuiz.questions.map((_, idx) => userAnswers[idx] ?? -1);
      await api.saveQuizResult(activeQuiz.id, answerArray, calculatedScore);
    } catch (err) {
      console.error('Failed saving quiz score:', err);
    }
  };

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bento-card p-5 sm:p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#65D6B0]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold text-[#F5F5F5]">AI Assessment Quiz</h1>
              <span className="text-[10px] font-mono text-[#65D6B0] px-2 py-0.5 rounded bg-[#65D6B0]/10 border border-[#65D6B0]/20">
                Evaluation
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">Interactive multiple-choice practice exams with instant answer validation</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-[#F47C7C]/10 border border-[#F47C7C]/30 text-[#F47C7C] text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generator Form */}
      {!activeQuiz && (
        <div className="bento-card p-6 sm:p-7 space-y-5">
          <form onSubmit={handleGenerateQuiz} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5 font-mono">
                Topic or Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Operating Systems, TCP/IP Protocols, Python OOP, Macroeconomics"
                value={subject}
                disabled={loading}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 font-mono">
                  Difficulty Level
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'easy', label: 'Easy' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'hard', label: 'Hard' }
                  ].map(diff => (
                    <button
                      type="button"
                      key={diff.id}
                      onClick={() => setDifficulty(diff.id as any)}
                      disabled={loading}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                        difficulty === diff.id
                          ? 'bg-[#65D6B0]/15 border-[#65D6B0] text-[#65D6B0]'
                          : 'bg-[#161618] border-[#242428] text-[#71717A] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 font-mono">
                  Question Count
                </label>
                <div className="flex gap-2">
                  {[3, 5, 8].map(cnt => (
                    <button
                      type="button"
                      key={cnt}
                      onClick={() => setQuestionCount(cnt)}
                      disabled={loading}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                        questionCount === cnt
                          ? 'bg-[#5B8CFF]/15 border-[#5B8CFF] text-[#5B8CFF]'
                          : 'bg-[#161618] border-[#242428] text-[#71717A] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !subject.trim()}
              className="w-full py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs sm:text-sm transition disabled:opacity-40 flex items-center justify-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Exam Questions...</span>
                </>
              ) : (
                <>
                  <span>Start Assessment Quiz</span>
                  <BrainCircuit className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Active Quiz Card View */}
      {activeQuiz && (
        <div className="space-y-5">
          {/* Quiz Status Header Bar */}
          <div className="bento-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono text-[#71717A] uppercase">Active Quiz</div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">{activeQuiz.subject}</h2>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-[#A1A1AA]">
                Answered: <span className="text-[#5B8CFF] font-bold">{answeredCount}</span>/{activeQuiz.questions.length}
              </span>

              <button
                onClick={() => {
                  setActiveQuiz(null);
                  setUserAnswers({});
                  setSubmitted(false);
                  setScore(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>

          {/* Results Summary Box if Submitted */}
          {submitted && score !== null && (
            <div className="bento-card p-6 border-[#65D6B0]/40 bg-[#111113] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#65D6B0]/10 border border-[#65D6B0]/30 flex items-center justify-center text-[#65D6B0]">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#65D6B0] font-bold">Assessment Completed</div>
                  <h3 className="text-xl font-bold font-mono text-[#F5F5F5] mt-0.5">Score: {score}%</h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    {score >= 80 ? 'Excellent mastery!' : score >= 60 ? 'Good effort, review incorrect concepts.' : 'Needs revision. Review explanations below.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setUserAnswers({});
                  setSubmitted(false);
                  setScore(null);
                }}
                className="px-4 py-2 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] border border-[#242428] rounded-xl text-xs font-semibold transition"
              >
                Retake Quiz
              </button>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-4">
            {activeQuiz.questions.map((q, qIndex) => {
              const selectedOpt = userAnswers[qIndex];
              const isCorrectAnswer = selectedOpt === q.answerIndex;

              return (
                <div
                  key={qIndex}
                  className="bento-card p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-[#5B8CFF] px-2 py-0.5 rounded bg-[#161618] border border-[#242428]">
                      Q{qIndex + 1}
                    </span>

                    {submitted && (
                      <span
                        className={`text-[11px] font-semibold font-mono flex items-center space-x-1 ${
                          isCorrectAnswer ? 'text-[#65D6B0]' : 'text-[#F47C7C]'
                        }`}
                      >
                        {isCorrectAnswer ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-[#F5F5F5] leading-relaxed">
                    {q.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, optIndex) => {
                      const isChosen = selectedOpt === optIndex;
                      const isRightOption = optIndex === q.answerIndex;

                      let optStyles = 'bg-[#161618] border-[#242428] text-[#A1A1AA] hover:border-[#383840] hover:text-[#F5F5F5]';

                      if (isChosen && !submitted) {
                        optStyles = 'bg-[#161618] border-[#5B8CFF] text-[#F5F5F5] shadow-[0_0_12px_rgba(91,140,255,0.15)]';
                      }

                      if (submitted) {
                        if (isRightOption) {
                          optStyles = 'bg-[#65D6B0]/10 border-[#65D6B0]/40 text-[#65D6B0] font-medium';
                        } else if (isChosen && !isRightOption) {
                          optStyles = 'bg-[#F47C7C]/10 border-[#F47C7C]/40 text-[#F47C7C]';
                        } else {
                          optStyles = 'bg-[#161618] border-[#242428] text-[#71717A] opacity-50';
                        }
                      }

                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => handleAnswerSelect(qIndex, optIndex)}
                          disabled={submitted}
                          className={`w-full p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${optStyles}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-5 h-5 rounded-md bg-[#111113] border border-[#242428] flex items-center justify-center font-mono text-[10px] uppercase shrink-0">
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className="leading-relaxed">{opt}</span>
                          </div>

                          {submitted && isRightOption && (
                            <Check className="w-4 h-4 text-[#65D6B0] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation if Submitted */}
                  {submitted && q.explanation && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#161618] border border-[#242428] text-xs space-y-1">
                      <span className="font-mono text-[10px] uppercase font-bold text-[#5B8CFF]">
                        Concept Breakdown
                      </span>
                      <p className="text-[#A1A1AA] leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Quiz Action Button */}
          {!submitted && (
            <div className="pt-2">
              <button
                onClick={handleSubmitQuiz}
                disabled={answeredCount === 0}
                className="w-full py-3 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs sm:text-sm transition disabled:opacity-40 shadow-[0_2px_16px_rgba(91,140,255,0.35)] flex items-center justify-center space-x-2"
              >
                <span>Submit Quiz for Instant AI Evaluation ({answeredCount}/{activeQuiz.questions.length} answered)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
