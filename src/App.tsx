import React, { useState, useEffect } from 'react';
import { QuizQuestion } from './types';
import { DEFAULT_MLBB_QUESTIONS } from './data/defaultQuestions';
import { Header, AppTab } from './components/Header';
import { QuestionListView } from './components/QuestionListView';
import { QuestionEditor } from './components/QuestionEditor';
import { OnlineRoom } from './components/OnlineRoom';
import { SoloQuiz } from './components/SoloQuiz';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('online');
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('mlbb_quiz_custom_questions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved questions', e);
    }
    return DEFAULT_MLBB_QUESTIONS;
  });

  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

  // Sync questions to localStorage
  const handleSaveQuestions = (updated: QuizQuestion[]) => {
    setQuestions(updated);
    try {
      localStorage.setItem('mlbb_quiz_custom_questions', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save questions to localStorage', e);
    }
  };

  const handleGoToEditor = (questionId?: string) => {
    if (questionId) {
      setSelectedEditId(questionId);
    }
    setActiveTab('editor');
  };

  const handlePlayOnlineWithQuestions = (customSet: QuizQuestion[]) => {
    handleSaveQuestions(customSet);
    setActiveTab('online');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setSelectedEditId(null);
          setActiveTab(tab);
        }}
        questionCount={questions.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'online' && (
          <OnlineRoom currentQuestions={questions} />
        )}

        {activeTab === 'solo' && (
          <SoloQuiz questions={questions} />
        )}

        {activeTab === 'editor' && (
          <QuestionEditor
            questions={questions}
            onSaveQuestions={handleSaveQuestions}
            selectedQuestionId={selectedEditId}
            onPlayOnlineWithQuestions={handlePlayOnlineWithQuestions}
          />
        )}

        {activeTab === 'overview' && (
          <QuestionListView
            questions={questions}
            onGoToEditor={handleGoToEditor}
            onPlayOnline={() => setActiveTab('online')}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MLBB Quiz Online • ระบบชุดคำถามและสร้างห้องแข่งขันออนไลน์ Mobile Legends: Bang Bang</span>
          <span className="text-slate-600">พร้อมระบบจัดการและแก้ไขคำถามคำตอบครบวงจร</span>
        </div>
      </footer>
    </div>
  );
}
