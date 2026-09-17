export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string]; // [ก, ข, ค, ง]
  correctIndex: number; // 0 = ก, 1 = ข, 2 = ค, 3 = ง
  explanation: string;
  difficulty: 'ง่าย' | 'ปานกลาง' | 'ยาก';
  category?: string;
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  role: string;
  isHost: boolean;
  score: number;
  streak: number;
  selectedAnswer: number | null; // index 0-3
  answerTimeSec: number | null;
  isCorrect: boolean | null;
  pointsAwarded: number;
  connected: boolean;
}

export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'finished';

export interface RoomState {
  roomCode: string;
  status: RoomStatus;
  hostId: string;
  currentQuestionIndex: number;
  timeRemaining: number;
  questionDuration: number;
  questions: QuizQuestion[];
  players: Record<string, RoomPlayer>;
  questionStartedAt: number;
}

export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string; avatar: string; role: string; questions?: QuizQuestion[]; questionDuration?: number }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string; avatar: string; role: string }
  | { type: 'UPDATE_QUESTIONS'; questions: QuizQuestion[] }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_ANSWER'; answerIndex: number }
  | { type: 'NEXT_QUESTION' }
  | { type: 'RESTART_GAME' }
  | { type: 'LEAVE_ROOM' };

export type ServerMessage =
  | { type: 'ROOM_STATE'; state: RoomState; yourPlayerId: string }
  | { type: 'ROOM_TICK'; timeRemaining: number }
  | { type: 'ERROR'; message: string };
