import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { OPTION_LABELS } from '../data/defaultQuestions';
import { Copy, Check, Sparkles, BookOpen, Layers, Award } from 'lucide-react';
import { playSound } from '../utils/audio';

interface QuestionListViewProps {
  questions: QuizQuestion[];
  onGoToEditor: (questionId?: string) => void;
  onPlayOnline: () => void;
}

export const QuestionListView: React.FC<QuestionListViewProps> = ({
  questions,
  onGoToEditor,
  onPlayOnline,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatQuestionText = (q: QuizQuestion, index: number): string => {
    const correctLetter = OPTION_LABELS[q.correctIndex];
    return `ข้อที่ ${index + 1}:
คำถาม: ${q.question}
ตัวเลือก:
 ก. ${q.options[0]}
 ข. ${q.options[1]}
 ค. ${q.options[2]}
 ง. ${q.options[3]}
เฉลย: ${correctLetter} ${q.options[q.correctIndex]}
คำอธิบายสั้นๆ: ${q.explanation}
ระดับความยาก: ${q.difficulty}`;
  };

  const copySingle = (q: QuizQuestion, index: number) => {
    playSound('click');
    const text = formatQuestionText(q, index);
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = () => {
    playSound('click');
    const fullText = questions.map((q, idx) => formatQuestionText(q, idx)).join('\n\n---\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ชุดคำถามสำหรับเกมออนไลน์
              </span>
              <span className="text-xs text-slate-400">หัวข้อ [เกม MLBB] 10 ข้อ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-['Kanit'] text-white">
              คลังข้อสอบ MLBB (Mobile Legends: Bang Bang)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              โครงสร้างมาตรฐานออนไลน์: คำถามกระชับ, 4 ตัวเลือก (ก. ข. ค. ง.), เฉลยชัดเจน, คำอธิบายความรู้เพิ่มเติม และระดับความยากปานกลาง
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="copy-all-questions-button"
              onClick={copyAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-sm font-medium transition-all shadow-md"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'คัดลอกครบ 10 ข้อแล้ว!' : 'คัดลอกทั้งหมดเป็นข้อความ'}</span>
            </button>

            <button
              id="start-online-from-list-button"
              onClick={onPlayOnline}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-sm font-bold transition-all shadow-lg shadow-amber-500/25"
            >
              <Sparkles className="w-4 h-4" />
              <span>สร้างห้องเล่นออนไลน์</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 gap-5">
        {questions.map((q, idx) => {
          const isCopied = copiedId === q.id;

          return (
            <div
              key={q.id}
              id={`question-card-${idx + 1}`}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold font-['Kanit'] flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {q.category && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {q.category}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      ระดับ: {q.difficulty}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`copy-q-btn-${idx + 1}`}
                    onClick={() => copySingle(q, idx)}
                    title="คัดลอกข้อนี้"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1 px-2.5"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกข้อนี้'}</span>
                  </button>

                  <button
                    id={`edit-q-btn-${idx + 1}`}
                    onClick={() => onGoToEditor(q.id)}
                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors text-xs font-medium px-2.5"
                  >
                    แก้ไขข้อนี้
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="mt-4">
                <div className="text-xs text-amber-400 font-semibold mb-1">คำถาม:</div>
                <h3 className="text-base sm:text-lg font-medium text-slate-100 font-['Kanit'] leading-relaxed">
                  {q.question}
                </h3>
              </div>

              {/* Options Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === q.correctIndex;
                  return (
                    <div
                      key={optIdx}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 font-medium ring-1 ring-emerald-500/40'
                          : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {OPTION_LABELS[optIdx]}
                      </span>
                      <span className="mt-0.5">{opt}</span>
                      {isCorrect && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold shrink-0">
                          เฉลย
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Details */}
              <div className="mt-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 font-semibold">คำอธิบายสั้นๆ: </strong>
                  {q.explanation}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
