import React, { useState } from 'react';
import { api } from '../services/api';
import { AiStudyMaterial } from '../types';
import { FileText, Sparkles, BookOpen, CheckCircle, Plus, Upload, RotateCw, AlertCircle } from 'lucide-react';

export const AiStudyMaterialView: React.FC = () => {
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [material, setMaterial] = useState<AiStudyMaterial | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || loading) return;

    setLoading(true);
    setError(null);
    try {
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(pdfFile);
      });

      const res = await api.analyzeMaterialPdf({
        title: title.trim() || pdfFile.name,
        pdfBase64,
        pdfFileName: pdfFile.name
      });
      setMaterial(res.material);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bento-card p-5 sm:p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold text-[#F5F5F5]">Ask From Study Material</h1>
              <span className="text-[10px] font-mono text-[#5B8CFF] px-2 py-0.5 rounded bg-[#5B8CFF]/10 border border-[#5B8CFF]/20">
                PDF Synthesizer
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">Upload textbook or lecture PDFs to extract key concepts, revision notes, and summaries</p>
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

      {/* Input Form */}
      {!material && (
        <div className="bento-card p-6 sm:p-7 space-y-4">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 font-mono">Upload Study Material (PDF)</label>
              <div className="p-8 border-2 border-dashed border-[#242428] hover:border-[#5B8CFF]/50 rounded-2xl bg-[#161618] text-center transition">
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  id="pdf-material-input"
                  disabled={loading}
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="pdf-material-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-7 h-7 text-[#5B8CFF]" />
                  <span className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">
                    {pdfFile ? pdfFile.name : 'Click or Drag & Drop PDF Document Here'}
                  </span>
                  <span className="text-[11px] text-[#71717A]">Supports PDF lecture slides, chapter notes, and research papers</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 font-mono">Document Title / Subject (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Chapter 5: Operating System Deadlocks & Memory"
                value={title}
                disabled={loading}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#161618] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF] disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !pdfFile}
              className="w-full py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs sm:text-sm transition disabled:opacity-40 flex items-center justify-center space-x-2 shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Reading & Analyzing PDF Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze PDF Study Material</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Analysis Output View */}
      {material && (
        <div className="space-y-5">
          <div className="bento-card p-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F5F5F5]">{material.title}</h2>
            <button
              onClick={() => { setMaterial(null); setPdfFile(null); setTitle(''); }}
              className="px-3.5 py-1.5 bg-[#161618] hover:bg-[#242428] text-[#5B8CFF] font-semibold rounded-xl text-xs transition border border-[#242428] flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Analyze Another PDF</span>
            </button>
          </div>

          {/* Executive Summary */}
          <div className="bento-card p-6 space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B8CFF]">Executive Summary</h3>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-line">{material.summary}</p>
          </div>

          {/* Key Revision Notes */}
          {material.notes.length > 0 && (
            <div className="bento-card p-6 space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#65D6B0]">Key Revision Notes</h3>
              <ul className="space-y-2">
                {material.notes.map((note, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs sm:text-sm text-[#A1A1AA]">
                    <CheckCircle className="w-4 h-4 text-[#65D6B0] shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Glossary Key Concepts */}
          {material.keyConcepts.length > 0 && (
            <div className="bento-card p-6 space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B7CFF]">Key Concepts Glossary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {material.keyConcepts.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#161618] border border-[#242428] space-y-1">
                    <div className="font-semibold text-[#5B8CFF] text-xs sm:text-sm">{item.term}</div>
                    <div className="text-xs text-[#71717A] leading-relaxed">{item.definition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
