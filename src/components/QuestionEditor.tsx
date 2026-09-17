import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { OPTION_LABELS, DEFAULT_MLBB_QUESTIONS } from '../data/defaultQuestions';
import { Plus, Trash2, Edit2, Check, RotateCcw, Download, Upload, Sparkles, AlertCircle, Save } from 'lucide-react';
import { playSound } from '../utils/audio';

interface QuestionEditorProps {
  questions: QuizQuestion[];
  onSaveQuestions: (updated: QuizQuestion[]) => void;
  selectedQuestionId?: string | null;
  onPlayOnlineWithQuestions: (questions: QuizQuestion[]) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  questions,
  onSaveQuestions,
  selectedQuestionId,
  onPlayOnlineWithQuestions,
}) => {
  const [editingId, setEditingId] = useState<string | null>(selectedQuestionId || null);
  const [formData, setFormData] = useState<QuizQuestion | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const startEdit = (q: QuizQuestion) => {
    playSound('click');
    setEditingId(q.id);
    setFormData(JSON.parse(JSON.stringify(q)));
  };

  const cancelEdit = () => {
    playSound('click');
    setEditingId(null);
    setFormData(null);
  };

  const handleSaveCurrent = () => {
    if (!formData) return;
    playSound('click');

    // Validation
    if (!formData.question.trim()) {
      alert('กรุณากรอกคำถาม');
      return;
    }
    if (formData.options.some((opt) => !opt.trim())) {
      alert('กรุณากรอกตัวเลือกทั้ง 4 ข้อให้ครบถ้วน');
      return;
    }

    const updated = questions.map((q) => (q.id === formData.id ? formData : q));
    onSaveQuestions(updated);
    setEditingId(null);
    setFormData(null);
    showToast('บันทึกการแก้ไขคำถามเรียบร้อยแล้ว!');
  };

  const handleDelete = (id: string) => {
    if (questions.length <= 1) {
      alert('ต้องมีคำถามอย่างน้อย 1 ข้อในระบบ');
      return;
    }
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคำถามข้อนี้?')) {
      playSound('click');
      const updated = questions.filter((q) => q.id !== id);
      onSaveQuestions(updated);
      if (editingId === id) {
        setEditingId(null);
        setFormData(null);
      }
      showToast('ลบคำถามสำเร็จ');
    }
  };

  const handleAddNew = () => {
    playSound('click');
    const newQ: QuizQuestion = {
      id: 'mlbb-custom-' + Date.now(),
      question: 'คำถามใหม่เกี่ยวกับ Mobile Legends: Bang Bang?',
      options: ['ตัวเลือก ก', 'ตัวเลือก ข', 'ตัวเลือก ค', 'ตัวเลือก ง'],
      correctIndex: 0,
      explanation: 'คำอธิบายประกอบเฉลย เพื่อให้ความรู้แก่ผู้เล่น',
      difficulty: 'ปานกลาง',
      category: 'ทั่วไป',
    };
    const updated = [...questions, newQ];
    onSaveQuestions(updated);
    startEdit(newQ);
    showToast('เพิ่มคำถามใหม่แล้ว สามารถแก้ไขเนื้อหาได้ทันที');
  };

  const handleResetToDefault = () => {
    if (confirm('ต้องการรีเซ็ตชุดคำถามกลับเป็น 10 ข้อมาตรฐานของ MLBB หรือไม่?')) {
      playSound('click');
      onSaveQuestions(DEFAULT_MLBB_QUESTIONS);
      setEditingId(null);
      setFormData(null);
      showToast('รีเซ็ตเป็น 10 ข้อมาตรฐานเรียบร้อยแล้ว');
    }
  };

  const openExportModal = () => {
    playSound('click');
    setJsonText(JSON.stringify(questions, null, 2));
    setShowJsonModal(true);
  };

  const applyImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('ข้อมูลต้องเป็น Array ของคำถาม');
      }
      // Check required fields
      parsed.forEach((item, i) => {
        if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
          throw new Error(`ข้อที่ ${i + 1} โครงสร้างไม่ถูกต้อง ต้องมีคำถามและ 4 ตัวเลือก`);
        }
      });
      playSound('correct');
      onSaveQuestions(parsed);
      setShowJsonModal(false);
      showToast(`นำเข้าสำเร็จ ${parsed.length} ข้อ`);
    } catch (e: unknown) {
      const err = e as Error;
      alert('รูปแบบ JSON ไม่ถูกต้อง: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-bounce">
          <Check className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Editor Header Bar */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ตัวจัดการและแก้ไขชุดคำถาม
            </span>
            <span className="text-xs text-slate-400">ทั้งหมด {questions.length} ข้อ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Kanit'] text-white">
            แก้ไขและจัดการคำถาม (MLBB Quiz Editor)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            ปรับแต่งคำถาม, 4 ตัวเลือก ก. ข. ค. ง., กำหนดเฉลยที่ถูกต้อง, ใส่คำอธิบายเพิ่มเติม และเลือกระดับความยาก
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="add-question-btn"
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มคำถามใหม่</span>
          </button>

          <button
            id="export-import-json-btn"
            onClick={openExportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            <span>นำเข้า / ส่งออก JSON</span>
          </button>

          <button
            id="reset-default-questions-btn"
            onClick={handleResetToDefault}
            title="รีเซ็ตกลับเป็น 10 ข้อมาตรฐาน MLBB"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700/60 hover:border-red-500/30 text-xs sm:text-sm font-medium transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตค่าเริ่มต้น</span>
          </button>

          <button
            id="play-online-with-current-set-btn"
            onClick={() => onPlayOnlineWithQuestions(questions)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all ml-auto md:ml-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>ใช้ชุดนี้เปิดห้องออนไลน์</span>
          </button>
        </div>
      </div>

      {/* Editing Form Modal / Inline Panel */}
      {editingId && formData && (
        <div id="editing-form-card" className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                ✏️
              </span>
              <h3 className="text-lg font-bold font-['Kanit'] text-white">
                กำลังแก้ไขคำถาม
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="cancel-edit-btn"
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                id="save-edit-btn"
                onClick={handleSaveCurrent}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/30 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกข้อนี้</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Question Text */}
            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1">
                คำถาม (สั้นกระชับ เข้าใจง่าย):
              </label>
              <textarea
                id="edit-question-input"
                rows={2}
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="เช่น สัตว์ประหลาดในป่าตัวใดช่วยเดินดันเลนบุกตีป้อมศัตรู?"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Category and Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  หมวดหมู่ (เช่น ฮีโร่, ไอเทม, ป่า):
                </label>
                <input
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="เช่น ไอเทม / กติกา"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ระดับความยาก:
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({ ...formData, difficulty: e.target.value as 'ง่าย' | 'ปานกลาง' | 'ยาก' })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="ง่าย">ง่าย</option>
                  <option value="ปานกลาง">ปานกลาง</option>
                  <option value="ยาก">ยาก</option>
                </select>
              </div>
            </div>

            {/* 4 Options and Correct Answer Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-amber-400">
                  ตัวเลือก 4 ข้อ (คลิกที่ปุ่มวงกลมเพื่อระบุเฉลยข้อที่ถูกต้อง):
                </label>
                <span className="text-xs text-emerald-400 font-medium">
                  เฉลยปัจจุบัน: ข้อ {OPTION_LABELS[formData.correctIndex]}
                </span>
              </div>

              <div className="space-y-2.5">
                {formData.options.map((opt, optIndex) => {
                  const isCorrect = formData.correctIndex === optIndex;
                  return (
                    <div
                      key={optIndex}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, correctIndex: optIndex })}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                          isCorrect
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="คลิกเพื่อเลือกข้อนี้เป็นเฉลย"
                      >
                        {OPTION_LABELS[optIndex]}
                      </button>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...formData.options] as [string, string, string, string];
                          newOpts[optIndex] = e.target.value;
                          setFormData({ ...formData, options: newOpts });
                        }}
                        placeholder={`กรอกตัวเลือกข้อ ${OPTION_LABELS[optIndex]}`}
                        className="w-full bg-transparent border-none text-sm text-slate-100 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, correctIndex: optIndex })}
                        className={`text-xs px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors ${
                          isCorrect
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isCorrect ? '✓ เป็นเฉลย' : 'ตั้งเป็นเฉลย'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1">
                คำอธิบายสั้นๆ (เหตุผลประกอบเฉลย เพื่อความรู้เพิ่มเติม):
              </label>
              <textarea
                id="edit-explanation-input"
                rows={2}
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="ระบุเหตุผลประกอบ เช่น พาสซีฟไอเทม, คอมโบฮีโร่ หรือรายละเอียดที่น่ารู้..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* List of Questions with Edit / Delete actions */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const isBeingEdited = editingId === q.id;

          return (
            <div
              key={q.id}
              className={`bg-slate-900/90 border rounded-xl p-4 sm:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isBeingEdited
                  ? 'border-amber-500 bg-amber-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {q.category || 'ทั่วไป'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40">
                    {q.difficulty}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-medium">
                    เฉลย: {OPTION_LABELS[q.correctIndex]}
                  </span>
                </div>

                <p className="text-sm sm:text-base font-medium text-slate-100 font-['Kanit'] line-clamp-2">
                  {q.question}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`truncate px-2 py-1 rounded ${
                        optIdx === q.correctIndex
                          ? 'text-emerald-300 font-semibold bg-emerald-950/40'
                          : 'bg-slate-950/50'
                      }`}
                    >
                      <span className="font-bold mr-1">{OPTION_LABELS[optIdx]}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  id={`btn-edit-item-${idx + 1}`}
                  onClick={() => startEdit(q)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium transition-colors border border-slate-700 hover:border-amber-500/40"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>

                <button
                  id={`btn-delete-item-${idx + 1}`}
                  onClick={() => handleDelete(q.id)}
                  title="ลบคำถามข้อนี้"
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors border border-slate-700/60 hover:border-red-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* JSON Import/Export Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-['Kanit'] text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-400" />
                <span>นำเข้าและส่งออกชุดคำถาม (JSON)</span>
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ ปิด
              </button>
            </div>

            <p className="text-xs text-slate-400">
              คุณสามารถคัดลอกโค้ด JSON ไปใช้งาน หรือวาง JSON ชุดคำถามใหม่แล้วกดนำเข้าได้ทันที
            </p>

            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-amber-200/90 focus:outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  showToast('คัดลอก JSON เรียบร้อยแล้ว');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                คัดลอก JSON ทั้งหมด
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={applyImportJson}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>นำเข้าชุดคำถามนี้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
