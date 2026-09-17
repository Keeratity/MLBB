import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { QuizQuestion, RoomPlayer, RoomState, ClientMessage, ServerMessage } from './src/types.ts';
import { DEFAULT_MLBB_QUESTIONS } from './src/data/defaultQuestions.ts';

const PORT = 3000;
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active rooms in-memory
interface ServerRoom {
  state: RoomState;
  sockets: Map<string, WebSocket>; // playerId -> ws
  timerInterval: NodeJS.Timeout | null;
  lastActive: number;
}

const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastRoomState(room: ServerRoom) {
  room.sockets.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      const msg: ServerMessage = {
        type: 'ROOM_STATE',
        state: room.state,
        yourPlayerId: playerId,
      };
      ws.send(JSON.stringify(msg));
    }
  });
}

function stopRoomTimer(room: ServerRoom) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function startQuestionTimer(room: ServerRoom) {
  stopRoomTimer(room);
  room.state.status = 'question';
  room.state.timeRemaining = room.state.questionDuration;
  room.state.questionStartedAt = Date.now();

  // Reset players' current question state
  Object.values(room.state.players).forEach(p => {
    p.selectedAnswer = null;
    p.answerTimeSec = null;
    p.isCorrect = null;
    p.pointsAwarded = 0;
  });

  broadcastRoomState(room);

  room.timerInterval = setInterval(() => {
    room.state.timeRemaining -= 1;

    // Check if everyone has answered
    const activePlayers = Object.values(room.state.players).filter(p => p.connected);
    const allAnswered = activePlayers.length > 0 && activePlayers.every(p => p.selectedAnswer !== null);

    if (room.state.timeRemaining <= 0 || allAnswered) {
      revealAnswers(room);
    } else {
      // Broadcast tick
      room.sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          const msg: ServerMessage = {
            type: 'ROOM_TICK',
            timeRemaining: Math.max(0, room.state.timeRemaining),
          };
          ws.send(JSON.stringify(msg));
        }
      });
    }
  }, 1000);
}

function revealAnswers(room: ServerRoom) {
  stopRoomTimer(room);
  room.state.status = 'reveal';
  const currentQ = room.state.questions[room.state.currentQuestionIndex];

  if (currentQ) {
    Object.values(room.state.players).forEach(p => {
      if (p.selectedAnswer !== null) {
        const correct = p.selectedAnswer === currentQ.correctIndex;
        p.isCorrect = correct;
        if (correct) {
          const speedBonus = Math.max(0, (room.state.timeRemaining || 0) * 40);
          const streakBonus = Math.min(p.streak * 50, 250);
          const points = 1000 + speedBonus + streakBonus;
          p.pointsAwarded = points;
          p.score += points;
          p.streak += 1;
        } else {
          p.pointsAwarded = 0;
          p.streak = 0;
        }
      } else {
        p.isCorrect = false;
        p.pointsAwarded = 0;
        p.streak = 0;
      }
    });
  }

  broadcastRoomState(room);
}

// Clean up stale rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms.entries()) {
    if (now - r.lastActive > 30 * 60 * 1000 && r.sockets.size === 0) {
      stopRoomTimer(r);
      rooms.delete(code);
    }
  }
}, 60000);

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data: ClientMessage = JSON.parse(raw.toString());

      if (data.type === 'CREATE_ROOM') {
        const code = generateRoomCode();
        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        const questionsToUse = data.questions && data.questions.length > 0 ? data.questions : DEFAULT_MLBB_QUESTIONS;
        const duration = data.questionDuration || 15;

        const hostPlayer: RoomPlayer = {
          id: playerId,
          name: (data.playerName || 'ผู้สร้างห้อง').trim().slice(0, 20),
          avatar: data.avatar || '⚔️',
          role: data.role || 'Jungler',
          isHost: true,
          score: 0,
          streak: 0,
          selectedAnswer: null,
          answerTimeSec: null,
          isCorrect: null,
          pointsAwarded: 0,
          connected: true,
        };

        const roomState: RoomState = {
          roomCode: code,
          status: 'lobby',
          hostId: playerId,
          currentQuestionIndex: 0,
          timeRemaining: duration,
          questionDuration: duration,
          questions: questionsToUse,
          players: { [playerId]: hostPlayer },
          questionStartedAt: 0,
        };

        const room: ServerRoom = {
          state: roomState,
          sockets: new Map([[playerId, ws]]),
          timerInterval: null,
          lastActive: Date.now(),
        };

        rooms.set(code, room);
        currentRoomCode = code;
        currentPlayerId = playerId;

        broadcastRoomState(room);
        return;
      }

      if (data.type === 'JOIN_ROOM') {
        const code = (data.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          const err: ServerMessage = { type: 'ERROR', message: `ไม่พบห้องรหัส "${code}" กรุณาตรวจสอบรหัสห้องอีกครั้ง` };
          ws.send(JSON.stringify(err));
          return;
        }

        if (room.state.status !== 'lobby') {
          const err: ServerMessage = { type: 'ERROR', message: 'ห้องนี้กำลังแข่งขันอยู่ ไม่สามารถเข้าร่วมได้ในขณะนี้' };
          ws.send(JSON.stringify(err));
          return;
        }

        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        const newPlayer: RoomPlayer = {
          id: playerId,
          name: (data.playerName || 'ผู้เล่น').trim().slice(0, 20),
          avatar: data.avatar || '🛡️',
          role: data.role || 'Roamer',
          isHost: false,
          score: 0,
          streak: 0,
          selectedAnswer: null,
          answerTimeSec: null,
          isCorrect: null,
          pointsAwarded: 0,
          connected: true,
        };

        room.state.players[playerId] = newPlayer;
        room.sockets.set(playerId, ws);
        room.lastActive = Date.now();
        currentRoomCode = code;
        currentPlayerId = playerId;

        broadcastRoomState(room);
        return;
      }

      // Action requires existing room & player
      if (!currentRoomCode || !currentPlayerId) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      room.lastActive = Date.now();

      if (data.type === 'UPDATE_QUESTIONS') {
        if (room.state.hostId === currentPlayerId && room.state.status === 'lobby') {
          if (data.questions && data.questions.length > 0) {
            room.state.questions = data.questions;
            broadcastRoomState(room);
          }
        }
        return;
      }

      if (data.type === 'START_GAME') {
        if (room.state.hostId === currentPlayerId && (room.state.status === 'lobby' || room.state.status === 'finished')) {
          room.state.currentQuestionIndex = 0;
          // Reset all scores
          Object.values(room.state.players).forEach(p => {
            p.score = 0;
            p.streak = 0;
            p.selectedAnswer = null;
            p.answerTimeSec = null;
            p.isCorrect = null;
            p.pointsAwarded = 0;
          });
          startQuestionTimer(room);
        }
        return;
      }

      if (data.type === 'SUBMIT_ANSWER') {
        if (room.state.status === 'question') {
          const player = room.state.players[currentPlayerId];
          if (player && player.selectedAnswer === null) {
            player.selectedAnswer = data.answerIndex;
            player.answerTimeSec = room.state.questionDuration - room.state.timeRemaining;
            broadcastRoomState(room);

            // If all active players have now answered, trigger immediate reveal
            const activePlayers = Object.values(room.state.players).filter(p => p.connected);
            if (activePlayers.every(p => p.selectedAnswer !== null)) {
              revealAnswers(room);
            }
          }
        }
        return;
      }

      if (data.type === 'NEXT_QUESTION') {
        if (room.state.hostId === currentPlayerId && room.state.status === 'reveal') {
          if (room.state.currentQuestionIndex + 1 < room.state.questions.length) {
            room.state.currentQuestionIndex += 1;
            startQuestionTimer(room);
          } else {
            // Finished game!
            room.state.status = 'finished';
            broadcastRoomState(room);
          }
        }
        return;
      }

      if (data.type === 'RESTART_GAME') {
        if (room.state.hostId === currentPlayerId) {
          stopRoomTimer(room);
          room.state.status = 'lobby';
          room.state.currentQuestionIndex = 0;
          Object.values(room.state.players).forEach(p => {
            p.score = 0;
            p.streak = 0;
            p.selectedAnswer = null;
            p.answerTimeSec = null;
            p.isCorrect = null;
            p.pointsAwarded = 0;
          });
          broadcastRoomState(room);
        }
        return;
      }

      if (data.type === 'LEAVE_ROOM') {
        room.sockets.delete(currentPlayerId);
        delete room.state.players[currentPlayerId];

        // If host left, assign new host or delete if empty
        const remainingPlayers = Object.keys(room.state.players);
        if (remainingPlayers.length === 0) {
          stopRoomTimer(room);
          rooms.delete(currentRoomCode);
        } else {
          if (room.state.hostId === currentPlayerId) {
            room.state.hostId = remainingPlayers[0];
            room.state.players[remainingPlayers[0]].isHost = true;
          }
          broadcastRoomState(room);
        }
        currentRoomCode = null;
        currentPlayerId = null;
        return;
      }
    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode && currentPlayerId) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.sockets.delete(currentPlayerId);
        if (room.state.players[currentPlayerId]) {
          room.state.players[currentPlayerId].connected = false;
        }

        const onlineCount = Array.from(room.sockets.values()).filter(s => s.readyState === WebSocket.OPEN).length;
        if (onlineCount === 0 && room.state.status === 'lobby') {
          stopRoomTimer(room);
          rooms.delete(currentRoomCode);
        } else {
          broadcastRoomState(room);
        }
      }
    }
  });
});

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
});

app.get('/api/default-questions', (_req, res) => {
  res.json({ questions: DEFAULT_MLBB_QUESTIONS });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomCode: room.state.roomCode,
    status: room.state.status,
    playerCount: Object.keys(room.state.players).length,
    totalQuestions: room.state.questions.length,
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MLBB Quiz Online server running on http://0.0.0.0:${PORT}`);
  });
}

start();
