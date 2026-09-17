import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { OPTION_LABELS } from '../data/defaultQuestions';
import { Play, RotateCcw, Clock, Flame, Check, X, HelpCircle, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../utils/audio';

interface SoloQuizProps {
  questions: QuizQuestion[];
  onFinish?: () => void;
}

export const SoloQuiz: React.FC<SoloQuizProps> = ({ questions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isFinished, setIsFinished] = useState(false);
  const [answersHistory, setAnswersHistory] = useState<
    { question: QuizQuestion; selected: number | null; isCorrect: boolean }[]
  >([]);

  const currentQ = questions[currentIndex];
  const questionDuration = 15;

  // Timer countdown
  useEffect(() => {
    if (isRevealed || isFinished || !currentQ) return;

    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
      if (timeLeft <= 5 && timeLeft > 1) {
        playSound('tick');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isRevealed, isFinished, currentQ]);

  const handleTimeOut = () => {
    playSound('wrong');
    setIsRevealed(true);
    setStreak(0);
    setAnswersHistory((prev) => [
      ...prev,
      { question: currentQ, selected: null, isCorrect: false },
    ]);
  };

  const handleSelectAnswer = (index: number) => {
    if (isRevealed || isFinished) return;
    playSound('click');
    setSelectedAnswer(index);
    setIsRevealed(true);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      playSound('correct');
      const speedBonus = Math.max(0, timeLeft * 40);
      const streakBonus = Math.min(streak * 50, 250);
      const points = 1000 + speedBonus + streakBonus;
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const next = prev + 1;
        setHighestStreak((h) => Math.max(h, next));
        return next;
      });
    } else {
      playSound('wrong');
      setStreak(0);
    }

    setAnswersHistory((prev) => [
      ...prev,
      { question: currentQ, selected: index, isCorrect },
    ]);
  };

  const handleNext = () => {
    playSound('click');
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsRevealed(false);
      setTimeLeft(questionDuration);
    } else {
      setIsFinished(true);
      playSound('victory');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleRestart = () => {
    playSound('click');
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setCorrectCount(0);
    setTimeLeft(questionDuration);
    setIsFinished(false);
    setAnswersHistory([]);
  };

  if (isFinished) {
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>สรุปผลการเล่นโหมดเดี่ยว</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold font-['Kanit'] text-white">
            {accuracy >= 80 ? 'VICTORY! ระดับตำนาน MLBB' : accuracy >= 50 ? 'ฝีมือระดับมือโปร!' : 'สู้ต่อไปเพื่อชัยชนะ!'}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">คะแนนรวม</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
                {score.toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">ตอบถูก</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {correctCount} / {questions.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">ความแม่นยำ</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400">
                {accuracy}%
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">สตรีคสูงสุด</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-orange-400">
                🔥 x{highestStreak}
              </div>
            </div>
          </div>

          {/* Review List */}
          <div className="space-y-3 text-left pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ทบทวนเฉลยทุกข้อ ({answersHistory.length} ข้อ):
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {answersHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs sm:text-sm space-y-1.5 ${
                    item.isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-red-950/20 border-red-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white">
                      ข้อ {idx + 1}: {item.question.question}
                    </span>
                    <span className={item.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {item.isCorrect ? '✓ ถูก' : '✗ ผิด'}
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs">
                    เฉลย: <strong>{OPTION_LABELS[item.question.correctIndex]} {item.question.options[item.question.correctIndex]}</strong>
                  </div>
                  <div className="text-slate-400 text-xs">
                    เหตุผล: {item.question.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            id="solo-play-again-btn"
            onClick={handleRestart}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/30 transition-all inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>เล่นใหม่อีกรอบ</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs sm:text-sm">
          ข้อ {currentIndex + 1} / {questions.length}
        </span>

        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
          <span className={`text-2xl font-mono font-black ${timeLeft <= 5 ? 'text-red-400' : 'text-amber-300'}`}>
            {timeLeft}s
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">คะแนน</div>
            <div className="text-base font-bold font-mono text-amber-400">
              {score.toLocaleString()}
            </div>
          </div>
          {streak > 1 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-orange-400" />
              <span>x{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
        <div
          className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {currentQ.category || 'MLBB Quiz'}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
            ความยาก: {currentQ.difficulty}
          </span>
        </div>

        <h2 className="text-lg sm:text-2xl font-bold font-['Kanit'] text-white leading-relaxed">
          {currentQ.question}
        </h2>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {currentQ.options.map((opt, optIndex) => {
            const isSelected = selectedAnswer === optIndex;
            const isCorrect = optIndex === currentQ.correctIndex;

            let style = 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:bg-slate-900';
            let badge = 'bg-slate-800 text-slate-400';

            if (isRevealed) {
              if (isCorrect) {
                style = 'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/60';
                badge = 'bg-emerald-500 text-slate-950 font-bold';
              } else if (isSelected && !isCorrect) {
                style = 'bg-red-950/60 border-red-500/80 text-red-200 line-through';
                badge = 'bg-red-500 text-white font-bold';
              } else {
                style = 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-50';
              }
            }

            return (
              <button
                key={optIndex}
                disabled={isRevealed}
                onClick={() => handleSelectAnswer(optIndex)}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${style} ${
                  isRevealed ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01]'
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${badge}`}>
                  {OPTION_LABELS[optIndex]}
                </span>
                <span className="text-sm sm:text-base font-medium">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Revealed feedback & explanation */}
        {isRevealed && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>คำอธิบายสั้นๆ (ความรู้เพิ่มเติม):</span>
              </div>
              <p className="text-sm text-amber-200/90 leading-relaxed font-['Prompt']">
                {currentQ.explanation}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                id="solo-next-btn"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
              >
                <span>{currentIndex + 1 < questions.length ? 'ข้อถัดไป' : 'ดูผลคะแนน'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
