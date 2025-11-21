
import { Timestamp } from 'firebase/firestore';

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'word-selection' | 'ended';
  currentRound: number;
  maxRounds: number;
  currentDrawerId?: string;
  secretWord?: string;
  createdAt: Timestamp;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  joinedAt: Timestamp;
}

export interface Stroke {
  id?: string;
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
}

export interface Guess {
  id?: string;
  playerId: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  createdAt: Timestamp;
}

export interface Round {
    id: string; // e.g., '1', '2'
    drawerId: string;
    secretWord: string;
    startedAt: Timestamp;
    endsAt?: Timestamp;
}
