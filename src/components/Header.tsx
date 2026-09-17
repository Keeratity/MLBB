import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Users, User, Edit3, FileText } from 'lucide-react';
import { playSound, setSoundMuted, getSoundMuted } from '../utils/audio';

export type AppTab = 'online' | 'solo' | 'editor' | 'overview';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  questionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, questionCount }) => {
  const [muted, setMuted] = useState(getSoundMuted());

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (!next) {
      playSound('click');
    }
  };

  return (
    <header className="border-b border-amber-500/20 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xl">
                ⚔️
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-['Kanit'] tracking-wide bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                  MLBB QUIZ ONLINE
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                  {questionCount} ข้อ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                เกมตอบคำถาม Mobile Legends: Bang Bang แข่งขันออนไลน์แบบเรียลไทม์
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Sound */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                id="nav-tab-online"
                onClick={() => { playSound('click'); onTabChange('online'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'online'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>สร้างห้องออนไลน์</span>
              </button>

              <button
                id="nav-tab-solo"
                onClick={() => { playSound('click'); onTabChange('solo'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'solo'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <User className="w-4 h-4" />
                <span>เล่นคนเดียว</span>
              </button>

              <button
                id="nav-tab-editor"
                onClick={() => { playSound('click'); onTabChange('editor'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'editor'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>แก้ไขคำถาม</span>
              </button>

              <button
                id="nav-tab-overview"
                onClick={() => { playSound('click'); onTabChange('overview'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>ดู 10 ข้อทั้งหมด</span>
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              id="audio-toggle-button"
              onClick={toggleSound}
              title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
              className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
