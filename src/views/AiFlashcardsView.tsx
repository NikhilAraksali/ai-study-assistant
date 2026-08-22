import React, { useState } from 'react';
import { api } from '../services/api';
import { AiFlashcardDeck, Flashcard } from '../types';
import { Layers, RotateCw, ChevronLeft, ChevronRight, Shuffle, CheckCircle2, Grid, Eye, Sparkles, AlertCircle } from 'lucide-react';

export const AiFlashcardsView: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<AiFlashcardDeck | null>(null);

  // Active Flashcard Deck State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'all'>('interactive');

  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setError(null);
    setFlipped(false);
    setCurrentIndex(0);

    try {
      const res = await api.generateFlashcards(topic.trim(), cardCount);
      if (!res.deck || !res.deck.cards || res.deck.cards.length === 0) {
        throw new Error('Received empty flashcard deck. Please try a different topic.');
      }
      setDeck(res.deck);
    } catch (err: any) {
      setError(err.message || 'Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!deck) return;
    setFlipped(false);
    setCurrentIndex(prev => (prev + 1) % deck.cards.length);
  };

  const handlePrev = () => {
    if (!deck) return;
    setFlipped(false);
    setCurrentIndex(prev => (prev - 1 + deck.cards.length) % deck.cards.length);
  };

  const handleShuffle = () => {
    if (!deck) return;
    setFlipped(false);
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    setDeck({ ...deck, cards: shuffled });
    setCurrentIndex(0);
  };

  const toggleMastered = (cardIndex: number = currentIndex) => {
    if (!deck) return;
    const updatedCards = [...deck.cards];
    updatedCards[cardIndex].mastered = !updatedCards[cardIndex].mastered;
    setDeck({ ...deck, cards: updatedCards });
  };

  const currentCard: Flashcard | undefined = deck?.cards[currentIndex];
  const masteredCount = deck?.cards.filter(c => c.mastered).length || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bento-card p-5 sm:p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#8B7CFF]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold text-[#F5F5F5]">AI Flashcard Generator</h1>
              <span className="text-[10px] font-mono text-[#8B7CFF] px-2 py-0.5 rounded bg-[#8B7CFF]/10 border border-[#8B7CFF]/20">
                Spaced Revision
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">Generate active-recall study flashcards for any technical concept</p>
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
      {!deck && (
        <div className="bento-card p-6 sm:p-7 space-y-4">
          <form onSubmit={handleGenerateDeck} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5 font-mono">
                Study Topic or Concept
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Networks, Microservices, Relational Calculus, Modern Physics"
                value={topic}
                disabled={loading}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#71717A] mb-1 font-mono">
                  Number of Cards
                </label>
                <div className="flex gap-2">
                  {[4, 6, 8, 10].map(cnt => (
                    <button
                      type="button"
                      key={cnt}
                      onClick={() => setCardCount(cnt)}
                      disabled={loading}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        cardCount === cnt
                          ? 'bg-[#8B7CFF]/15 border-[#8B7CFF] text-[#8B7CFF]'
                          : 'bg-[#161618] border-[#242428] text-[#71717A] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {cnt} Cards
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <p className="text-[11px] text-[#71717A] leading-relaxed">
                  Fast JSON schema-guided AI generation for instant key point extraction.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs sm:text-sm transition disabled:opacity-40 flex items-center justify-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Concept Cards...</span>
                </>
              ) : (
                <>
                  <span>Generate Flashcard Deck</span>
                  <Layers className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Flashcard Deck Viewer */}
      {deck && currentCard && (
        <div className="space-y-5">
          {/* Deck Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A1A1AA]">
            <span className="font-semibold text-[#F5F5F5]">Topic: {deck.topic}</span>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-[11px]">
                Mastered: <span className="text-[#65D6B0] font-bold">{masteredCount}</span>/{deck.cards.length}
              </span>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#161618] p-0.5 rounded-xl border border-[#242428]">
                <button
                  onClick={() => setViewMode('interactive')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1 ${
                    viewMode === 'interactive'
                      ? 'bg-[#111113] text-[#5B8CFF] border border-[#242428]'
                      : 'text-[#71717A]'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Card</span>
                </button>

                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1 ${
                    viewMode === 'all'
                      ? 'bg-[#111113] text-[#5B8CFF] border border-[#242428]'
                      : 'text-[#71717A]'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>All ({deck.cards.length})</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setDeck(null);
                  setTopic('');
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#A1A1AA] hover:text-[#F5F5F5]"
              >
                + New Deck
              </button>
            </div>
          </div>

          {/* Interactive Card Mode */}
          {viewMode === 'interactive' ? (
            <div className="space-y-4">
              {/* The Flip Card */}
              <div
                onClick={() => setFlipped(!flipped)}
                className="bento-card p-8 sm:p-12 min-h-[260px] flex flex-col justify-between cursor-pointer border hover:border-[#5B8CFF]/50 transition group select-none relative"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[#71717A]">
                  <span className="uppercase tracking-wider">
                    {flipped ? 'Card Back (Explanation)' : 'Card Front (Question/Concept)'}
                  </span>
                  <span>
                    Card {currentIndex + 1} of {deck.cards.length}
                  </span>
                </div>

                <div className="my-6 text-center">
                  {!flipped ? (
                    <div className="text-base sm:text-xl font-medium text-[#F5F5F5] leading-relaxed">
                      {currentCard.front}
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                      {currentCard.back}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#242428] text-xs text-[#71717A]">
                  <span className="flex items-center space-x-1 group-hover:text-[#5B8CFF] transition">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click card to flip</span>
                  </span>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleMastered();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                      currentCard.mastered
                        ? 'bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/30'
                        : 'bg-[#161618] text-[#71717A] hover:text-[#F5F5F5] border border-[#242428]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentCard.mastered ? 'Mastered' : 'Mark Mastered'}</span>
                  </button>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-[#111113] border border-[#242428] text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#383840] transition flex items-center space-x-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={handleShuffle}
                  className="p-2 rounded-xl bg-[#111113] border border-[#242428] text-xs font-semibold text-[#71717A] hover:text-[#F5F5F5] transition"
                  title="Shuffle cards"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-[#111113] border border-[#242428] text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#383840] transition flex items-center space-x-1.5"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* All Cards Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deck.cards.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="bento-card p-4 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                      <span>CARD #{idx + 1}</span>
                      {c.mastered && (
                        <span className="text-[#65D6B0] font-bold flex items-center space-x-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mastered</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-[#F5F5F5] mt-1.5">
                      {c.front}
                    </div>
                    <div className="text-xs text-[#A1A1AA] mt-2 pt-2 border-t border-[#242428] leading-relaxed">
                      {c.back}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleMastered(idx)}
                    className={`w-full mt-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                      c.mastered
                        ? 'bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/30'
                        : 'bg-[#161618] text-[#71717A] hover:text-[#F5F5F5] border border-[#242428]'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{c.mastered ? 'Mastered' : 'Mark as Mastered'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
