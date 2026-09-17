import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, RoomPlayer, RoomState, ClientMessage, ServerMessage } from '../types';
import { OPTION_LABELS } from '../data/defaultQuestions';
import {
  Users,
  Copy,
  Check,
  Play,
  ArrowRight,
  RotateCcw,
  Trophy,
  Flame,
  Clock,
  LogOut,
  Sparkles,
  Shield,
  Zap,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../utils/audio';

interface OnlineRoomProps {
  currentQuestions: QuizQuestion[];
}

const ROLES = [
  { name: 'Assassin', icon: '🗡️', desc: 'มือสังหารดาเมจไว' },
  { name: 'Marksman', icon: '🏹', desc: 'แครี่ยิงไกลท้ายเกม' },
  { name: 'Mage', icon: '🔮', desc: 'เมจดาเมจเวทระเบิด' },
  { name: 'Tank', icon: '🛡️', desc: 'แทงค์เปิดไฟต์คุมเกม' },
  { name: 'Fighter', icon: '🥊', desc: 'ไฟต์เตอร์ยืนชนดันเลน' },
  { name: 'Support', icon: '🌿', desc: 'ซัพพอร์ตบัฟฮีลเพื่อน' },
];

export const OnlineRoom: React.FC<OnlineRoomProps> = ({ currentQuestions }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  // Form states
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('mlbb_player_name') || 'Miya_Pro';
  });
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [questionDuration, setQuestionDuration] = useState(15);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio tick tracker
  const lastTickRef = useRef<number | null>(null);

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/ws`);

    socket.onopen = () => {
      setConnected(true);
      setErrorMessage(null);
    };

    socket.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'ROOM_STATE') {
          setRoomState(msg.state);
          setMyPlayerId(msg.yourPlayerId);
          setErrorMessage(null);
        } else if (msg.type === 'ROOM_TICK') {
          setRoomState((prev) => (prev ? { ...prev, timeRemaining: msg.timeRemaining } : null));

          if (msg.timeRemaining <= 5 && msg.timeRemaining > 0 && lastTickRef.current !== msg.timeRemaining) {
            lastTickRef.current = msg.timeRemaining;
            playSound('tick');
          }
        } else if (msg.type === 'ERROR') {
          setErrorMessage(msg.message);
          playSound('wrong');
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = (err) => {
      console.warn('WS error', err);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  // Save nickname locally
  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem('mlbb_player_name', playerName.trim());
    }
  }, [playerName]);

  // Audio effects when state changes
  useEffect(() => {
    if (!roomState) return;

    if (roomState.status === 'question' && roomState.timeRemaining === roomState.questionDuration) {
      playSound('start');
    } else if (roomState.status === 'reveal') {
      const me = myPlayerId ? roomState.players[myPlayerId] : null;
      if (me && me.isCorrect) {
        playSound('correct');
      } else {
        playSound('reveal');
      }
    } else if (roomState.status === 'finished') {
      playSound('victory');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#38bdf8', '#fbbf24'],
      });
    }
  }, [roomState?.status, roomState?.currentQuestionIndex]);

  const sendWs = (msg: ClientMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      setErrorMessage('ระบบยังไม่เชื่อมต่อกับเซิร์ฟเวอร์ กรุณารอสักครู่...');
    }
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage('กรุณากรอกชื่อเล่นของคุณ');
      return;
    }
    playSound('click');
    sendWs({
      type: 'CREATE_ROOM',
      playerName: playerName.trim(),
      avatar: selectedRole.icon,
      role: selectedRole.name,
      questions: currentQuestions,
      questionDuration,
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage('กรุณากรอกชื่อเล่นของคุณ');
      return;
    }
    if (!joinCodeInput.trim()) {
      setErrorMessage('กรุณากรอกรหัสห้อง 5 ตัวอักษร');
      return;
    }
    playSound('click');
    sendWs({
      type: 'JOIN_ROOM',
      roomCode: joinCodeInput.trim().toUpperCase(),
      playerName: playerName.trim(),
      avatar: selectedRole.icon,
      role: selectedRole.name,
    });
  };

  const handleStartGame = () => {
    playSound('click');
    sendWs({ type: 'START_GAME' });
  };

  const handleSubmitAnswer = (index: number) => {
    if (!roomState || roomState.status !== 'question') return;
    const me = myPlayerId ? roomState.players[myPlayerId] : null;
    if (me && me.selectedAnswer !== null) return; // already answered
    playSound('click');
    sendWs({ type: 'SUBMIT_ANSWER', answerIndex: index });
  };

  const handleNextQuestion = () => {
    playSound('click');
    sendWs({ type: 'NEXT_QUESTION' });
  };

  const handleRestartGame = () => {
    playSound('click');
    sendWs({ type: 'RESTART_GAME' });
  };

  const handleLeaveRoom = () => {
    playSound('click');
    sendWs({ type: 'LEAVE_ROOM' });
    setRoomState(null);
    setMyPlayerId(null);
  };

  const copyRoomCode = () => {
    if (!roomState) return;
    playSound('click');
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const me = roomState && myPlayerId ? roomState.players[myPlayerId] : null;
  const isHost = me?.isHost ?? false;
  const currentQ = roomState?.questions[roomState.currentQuestionIndex];

  // Sorted players by score for leaderboards
  const sortedPlayers: RoomPlayer[] = roomState
    ? (Object.values(roomState.players) as RoomPlayer[]).sort((a, b) => b.score - a.score)
    : [];

  // ==========================================
  // VIEW 1: NOT IN ROOM (Create or Join)
  // ==========================================
  if (!roomState) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ระบบเล่นพร้อมกันแบบเรียลไทม์ (Multiplayer Cloud)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-['Kanit'] tracking-tight text-white">
              สร้างห้องประลองปัญญา <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Land of Dawn</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              ตอบคำถาม MLBB พร้อมกันกับเพื่อนๆ ลุ้นคะแนนความไว โบนัสสตรีค และจัดอันดับ MVP ประจำรอบสดๆ ทันที!
            </p>
          </div>
        </div>

        {/* Player Profile Setup */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold font-['Kanit'] text-white flex items-center gap-2">
            <span>👤</span>
            <span>ตั้งค่าข้อมูลผู้เล่นของคุณ</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ชื่อเล่นในเกม (Nickname):
              </label>
              <input
                id="player-nickname-input"
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="เช่น Layla_Sniper หรือ Chou_God"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                เลือกตำแหน่งฮีโร่ที่คุณชอบ:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const isSelected = selectedRole.name === r.name;
                  return (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => { playSound('click'); setSelectedRole(r); }}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{r.icon}</span>
                      <span className="truncate">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards: Create Room vs Join Room */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Create Room */}
          <div className="bg-slate-900/90 border border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl font-bold">
                👑
              </div>
              <h3 className="text-xl font-bold font-['Kanit'] text-white">
                สร้างห้องใหม่ (Host Game)
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                สร้างห้องแข่งขัน รับรหัสห้อง 5 ตัวอักษรเพื่อส่งให้เพื่อนเข้ามาตอบคำถามพร้อมกัน
              </p>

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>เวลาตอบต่อข้อ:</span>
                  <span className="font-bold text-amber-400">{questionDuration} วินาที</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setQuestionDuration(sec)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        questionDuration === sec
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sec} วิ
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-400 pt-1 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ใช้ชุดคำถามปัจจุบัน ({currentQuestions.length} ข้อ)</span>
                </div>
              </div>
            </div>

            <button
              id="btn-create-room"
              onClick={handleCreateRoom}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>เปิดห้องแข่งขันใหม่</span>
            </button>
          </div>

          {/* Card 2: Join Room */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center text-2xl font-bold">
                🎮
              </div>
              <h3 className="text-xl font-bold font-['Kanit'] text-white">
                เข้าร่วมห้องด้วยรหัส (Join Room)
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                กรอกรหัสห้อง 5 ตัวอักษรที่ได้รับจากเพื่อน เพื่อเข้าสู่ล็อบบี้แข่งขัน
              </p>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  รหัสห้อง (Room Code):
                </label>
                <input
                  id="join-room-code-input"
                  type="text"
                  maxLength={5}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="เช่น ABC99"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-bold font-mono tracking-widest text-amber-400 uppercase placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              id="btn-join-room"
              onClick={handleJoinRoom}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 hover:border-sky-500/40 font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>เข้าร่วมห้องแข่งขัน</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOBBY (Waiting for Host to start)
  // ==========================================
  if (roomState.status === 'lobby') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <span>ห้องแข่งขันออนไลน์ MLBB</span>
          </div>

          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-400">รหัสห้องสำหรับเชิญเพื่อน:</div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono tracking-widest text-amber-400 bg-slate-950 px-6 py-2 rounded-2xl border border-amber-500/40 shadow-inner">
                {roomState.roomCode}
              </span>
              <button
                id="btn-copy-room-code"
                onClick={copyRoomCode}
                title="คัดลอกรหัสห้อง"
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/40 transition-colors shadow-md"
              >
                {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              ส่งรหัสนี้ให้เพื่อน หรือเปิดอีกแท็บเพื่อทดลองเล่นพร้อมกันได้เลย!
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-300 py-2 border-y border-slate-800">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>ผู้เล่นในห้อง: <strong>{Object.keys(roomState.players).length} คน</strong></span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>เวลาตอบ: <strong>{roomState.questionDuration} วินาที/ข้อ</strong></span>
            </span>
            <span className="text-slate-600">•</span>
            <span>จำนวน: <strong>{roomState.questions.length} ข้อ</strong></span>
          </div>

          {/* Player Cards */}
          <div className="space-y-2 text-left pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              รายชื่อผู้เล่นที่พร้อมแข่งขัน ({Object.keys(roomState.players).length}):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sortedPlayers.map((p) => {
                const isMe = p.id === myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{p.avatar}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white">{p.name}</span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-semibold">
                              (คุณ)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{p.role}</span>
                      </div>
                    </div>

                    {p.isHost && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold flex items-center gap-1">
                        <span>👑</span>
                        <span>หัวหน้าห้อง</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <button
              id="btn-leave-room"
              onClick={handleLeaveRoom}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากห้อง</span>
            </button>

            {isHost ? (
              <button
                id="btn-start-game-host"
                onClick={handleStartGame}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>เริ่มการแข่งขันทันที!</span>
              </button>
            ) : (
              <div className="text-xs sm:text-sm text-amber-400/90 font-medium animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>รอหัวหน้าห้อง ({sortedPlayers.find((p) => p.isHost)?.name || 'Host'}) กดเริ่มเกม...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3 & 4: QUESTION & REVEAL ACTIVE GAME
  // ==========================================
  if (roomState.status === 'question' || roomState.status === 'reveal') {
    if (!currentQ) return null;

    const isQuestionState = roomState.status === 'question';
    const isRevealState = roomState.status === 'reveal';
    const hasAnswered = me && me.selectedAnswer !== null;
    const progressPercent = ((roomState.currentQuestionIndex + 1) / roomState.questions.length) * 100;
    const timeRatio = roomState.timeRemaining / roomState.questionDuration;

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top Battle Status Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs sm:text-sm">
              ข้อ {roomState.currentQuestionIndex + 1} / {roomState.questions.length}
            </span>
            <div className="text-xs text-slate-400 hidden sm:block">
              ห้อง: <span className="font-mono font-bold text-slate-200">{roomState.roomCode}</span>
            </div>
          </div>

          {/* Animated Countdown Timer */}
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${roomState.timeRemaining <= 5 ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
            <div className="flex items-baseline gap-1">
              <span
                className={`text-2xl font-black font-mono transition-colors ${
                  roomState.timeRemaining <= 5 ? 'text-red-400 scale-110' : 'text-amber-300'
                }`}
              >
                {roomState.timeRemaining}
              </span>
              <span className="text-xs text-slate-500">วิ</span>
            </div>
          </div>

          {/* Player Score & Streak */}
          {me && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">คะแนนคุณ</div>
                <div className="text-sm sm:text-base font-bold text-amber-400 font-mono">
                  {me.score.toLocaleString()}
                </div>
              </div>
              {me.streak > 1 && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold animate-pulse">
                  <Flame className="w-3.5 h-3.5 fill-orange-400" />
                  <span>x{me.streak}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Question Box */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {currentQ.category || 'MLBB Quiz'}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
              ความยาก: {currentQ.difficulty}
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-bold font-['Kanit'] text-white leading-relaxed">
            {currentQ.question}
          </h2>

          {/* 4 Choices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentQ.options.map((opt, optIndex) => {
              const label = OPTION_LABELS[optIndex];
              const isSelectedByMe = me?.selectedAnswer === optIndex;
              const isCorrectAnswer = optIndex === currentQ.correctIndex;

              let buttonStyle = 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:bg-slate-900';
              let badgeStyle = 'bg-slate-800 text-slate-400';

              if (isQuestionState) {
                if (isSelectedByMe) {
                  buttonStyle = 'bg-amber-500/20 border-amber-500 text-amber-200 ring-2 ring-amber-500/40';
                  badgeStyle = 'bg-amber-500 text-slate-950 font-bold';
                }
              } else if (isRevealState) {
                if (isCorrectAnswer) {
                  buttonStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/20';
                  badgeStyle = 'bg-emerald-500 text-slate-950 font-bold';
                } else if (isSelectedByMe && !isCorrectAnswer) {
                  buttonStyle = 'bg-red-950/60 border-red-500/80 text-red-200 line-through opacity-70';
                  badgeStyle = 'bg-red-500 text-white font-bold';
                } else {
                  buttonStyle = 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-50';
                }
              }

              return (
                <button
                  key={optIndex}
                  id={`choice-btn-${optIndex}`}
                  disabled={!isQuestionState || hasAnswered}
                  onClick={() => handleSubmitAnswer(optIndex)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${buttonStyle} ${
                    !isQuestionState || hasAnswered ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${badgeStyle}`}
                  >
                    {label}
                  </span>
                  <span className="text-sm sm:text-base font-medium leading-relaxed">{opt}</span>
                  {isRevealState && isCorrectAnswer && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                      ✓ ถูกต้อง
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Real-time Answer Status Banner */}
          {isQuestionState && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                {hasAnswered ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>คุณส่งคำตอบแล้ว! รอเพื่อนๆ ตอบครบ หรือหมดเวลา</span>
                  </span>
                ) : (
                  <span className="text-amber-400 animate-pulse">
                    ⚡ เลือกคำตอบของคุณ ยิ่งตอบไวยิ่งได้คะแนนโบนัส!
                  </span>
                )}
              </div>

              {/* Who answered indicator */}
              <div className="flex items-center gap-1">
                {(Object.values(roomState.players) as RoomPlayer[]).map((p) => (
                  <span
                    key={p.id}
                    title={`${p.name} ${p.selectedAnswer !== null ? '(ตอบแล้ว)' : '(ยังไม่ตอบ)'}`}
                    className={`text-sm transition-all ${
                      p.selectedAnswer !== null ? 'opacity-100 scale-110' : 'opacity-30 grayscale'
                    }`}
                  >
                    {p.avatar}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reveal Feedback & Explanation */}
          {isRevealState && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* Outcome Banner */}
              {me && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    me.isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      : 'bg-red-950/40 border-red-500/50 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{me.isCorrect ? '🔥' : '💀'}</span>
                    <div>
                      <div className="font-bold font-['Kanit'] text-base">
                        {me.isCorrect ? 'Savage! คุณตอบถูกต้อง!' : 'Defeat! พลาดไปนิดเดียว'}
                      </div>
                      <div className="text-xs opacity-80">
                        {me.isCorrect
                          ? `ได้รับ +${me.pointsAwarded.toLocaleString()} คะแนน (รวมโบนัสความไว)`
                          : 'ไม่ได้คะแนนในข้อนี้ สู้ใหม่ในข้อถัดไป!'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold text-lg">
                    {me.isCorrect ? `+${me.pointsAwarded}` : '+0'}
                  </div>
                </div>
              )}

              {/* Educational Explanation Box */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>คำอธิบายสั้นๆ (เหตุผลประกอบเฉลย เพื่อความรู้เพิ่มเติม):</span>
                </div>
                <p className="text-sm text-amber-200/90 leading-relaxed font-['Prompt']">
                  {currentQ.explanation}
                </p>
              </div>

              {/* Current Round Ranking */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  อันดับคะแนนล่าสุด:
                </h4>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {sortedPlayers.map((p, rank) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                        p.id === myPlayerId ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-bold text-slate-400">#{rank + 1}</span>
                        <span>{p.avatar}</span>
                        <span className="font-bold text-slate-200">{p.name}</span>
                        {p.isCorrect && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                            +{p.pointsAwarded}
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-amber-400">
                        {p.score.toLocaleString()} คะแนน
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Next Question Control */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {isHost ? 'คุณเป็นหัวหน้าห้อง ควบคุมจังหวะการเปลี่ยนข้อ' : 'รอหัวหน้าห้องนำสู่ข้อถัดไป...'}
                </div>

                {isHost && (
                  <button
                    id="btn-next-question-host"
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5"
                  >
                    <span>
                      {roomState.currentQuestionIndex + 1 < roomState.questions.length
                        ? 'คำถามข้อถัดไป'
                        : 'ดูผลการแข่งขัน (MVP)'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 5: FINISHED / VICTORY MVP PODIUM
  // ==========================================
  if (roomState.status === 'finished') {
    const winner = sortedPlayers[0];

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>จบการแข่งขัน MLBB QUIZ BATTLE!</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-['Kanit'] tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            VICTORY!
          </h2>

          {/* MVP Podium */}
          {winner && (
            <div className="py-4">
              <div className="inline-block relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-1 shadow-2xl shadow-amber-500/30 mx-auto flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-5xl sm:text-6xl">
                    {winner.avatar}
                  </div>
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                  👑 MVP
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold font-['Kanit'] text-white">
                  {winner.name}
                </h3>
                <p className="text-xs text-slate-400">{winner.role}</p>
                <div className="text-2xl font-black font-mono text-amber-400">
                  {winner.score.toLocaleString()} คะแนน
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="space-y-2 text-left">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ตารางคะแนนสรุปทั้งหมด:
            </h4>
            <div className="space-y-2">
              {sortedPlayers.map((p, idx) => {
                const isMe = p.id === myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      idx === 0
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : isMe
                        ? 'bg-slate-900 border-amber-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 text-center font-black font-mono text-slate-400 text-sm">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="text-2xl">{p.avatar}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white">{p.name}</span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 rounded bg-amber-500/20 text-amber-300">
                              (คุณ)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{p.role}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-400 text-base">
                        {p.score.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">คะแนนรวม</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-slate-800">
            <button
              onClick={handleLeaveRoom}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
            >
              ออกจากห้อง
            </button>

            {isHost && (
              <button
                id="btn-restart-game"
                onClick={handleRestartGame}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นใหม่อีกรอบ (Play Again)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
