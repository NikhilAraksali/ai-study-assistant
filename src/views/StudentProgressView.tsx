import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StudentProgress } from '../types';
import { BarChart3, BrainCircuit, CheckCircle2, Layers, Bot, Award, TrendingUp } from 'lucide-react';

export const StudentProgressView: React.FC = () => {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getStudentDashboard();
        setProgress(data.progress || null);
      } catch (err) {
        console.error('Error loading progress:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bento-card p-5 sm:p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold text-[#F5F5F5]">Student Progress Analytics</h1>
              <span className="text-[10px] font-mono text-[#5B8CFF] px-2 py-0.5 rounded bg-[#5B8CFF]/10 border border-[#5B8CFF]/20">
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">Real activity tracking across quizzes, assignments, and AI study sessions</p>
          </div>
        </div>
      </div>

      {/* Metric Bento Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#111113] border border-[#242428] space-y-2">
          <div className="flex items-center justify-between text-[#5B8CFF]">
            <BrainCircuit className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] font-mono">Quizzes</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{progress?.avgQuizScore || 0}%</div>
          <div className="text-[11px] text-[#71717A] font-mono">Avg Score ({progress?.quizzesTaken || 0} taken)</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111113] border border-[#242428] space-y-2">
          <div className="flex items-center justify-between text-[#65D6B0]">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] font-mono">Submissions</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{progress?.completedAssignments || 0}</div>
          <div className="text-[11px] text-[#71717A] font-mono">Turned In</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111113] border border-[#242428] space-y-2">
          <div className="flex items-center justify-between text-[#5B8CFF]">
            <Bot className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] font-mono">AI Queries</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{progress?.totalAiInteractions || 0}</div>
          <div className="text-[11px] text-[#71717A] font-mono">Study Interactions</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111113] border border-[#242428] space-y-2">
          <div className="flex items-center justify-between text-[#8B7CFF]">
            <Layers className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] font-mono">Cards</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{progress?.flashcardsMastered || 0}</div>
          <div className="text-[11px] text-[#71717A] font-mono">Mastered</div>
        </div>
      </div>

      {/* Analytics Info Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#111113] border border-[#242428] space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-[#F5F5F5] flex items-center space-x-2">
          <Award className="w-4 h-4 text-[#5B8CFF]" />
          <span>Cross-Platform Telemetry Status</span>
        </h3>
        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          Your progress metrics are synchronized live across both the Web platform and your Android Mobile App. Every quiz taken, flashcard mastered, and assignment submitted instantly updates your persistent cloud profile.
        </p>
      </div>
    </div>
  );
};
