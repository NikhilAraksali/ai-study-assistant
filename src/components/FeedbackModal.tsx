import React, { useState } from 'react';
import { api } from '../services/api';
import { Star, MessageSquare, X, Send, CheckCircle2 } from 'lucide-react';

interface FeedbackModalProps {
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<'classroom' | 'ai_tools' | 'general' | 'assignments'>('general');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setError('Please provide feedback comments');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.submitFeedback({ rating, category, comments });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111113] border border-[#242428] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-[#161618] text-[#71717A] hover:text-[#F5F5F5] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#65D6B0]/10 text-[#65D6B0] border border-[#65D6B0]/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#F5F5F5]">Thank You for Your Feedback!</h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Your ratings and comments help improve ScholarAI classroom experiences and AI study tools.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] border border-[#242428] font-semibold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#161618] text-[#5B8CFF] border border-[#242428] flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#F5F5F5]">Student Feedback</h2>
                <p className="text-xs text-[#71717A]">Share your experience with ScholarAI</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#F47C7C]/10 border border-[#F47C7C]/20 text-xs text-[#F47C7C]">
                {error}
              </div>
            )}

            {/* Star Rating */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 font-mono">Rating</label>
              <div className="flex items-center space-x-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-[#F2B866] fill-[#F2B866]'
                          : 'text-[#242428]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Feedback Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
              >
                <option value="general">General Experience</option>
                <option value="classroom">Classrooms & PDF Notes</option>
                <option value="ai_tools">AI Study Tools & Flashcards</option>
                <option value="assignments">Assignments & Submissions</option>
              </select>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 font-mono">Your Comments & Suggestions</label>
              <textarea
                rows={4}
                required
                placeholder="What did you like? Anything we can improve?"
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#242428]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !comments.trim()}
                className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition disabled:opacity-40 flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting...' : 'Send Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
