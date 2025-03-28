// configs/interfaces.ts
import { ThemeId } from './consts';

export interface PlayerData {
  id: number;
  fakeName: string;
  realName?: string;
  joinTime?: string;
  votes?: number;
  isLost: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  questionsPerRound: number;
  timePerRound: number;
  timePerVote: number;
  theme: ThemeId;
}

export interface RoomData {
  roomId: number;
  roomCode: string;
  roomState: 'waiting' | 'playing' | 'ended';
  hostId: number;
  settings: RoomSettings;
  roomRound: number;
  roundStartTime?: string;
  createdAt?: string;
  expiresAt?: string;
  players?: PlayerData[];
  aiEliminated?: boolean;
}

export interface StoredData {
  id: number;
  realName: string;
  isHost: boolean;
  roomId: number;
  roomCode: string;
}

export enum InterfaceState {
  Waiting, 
  Question,
  Voting,
}

export interface QuestionData {
  id: number;
  content: string;
  playerAnswers: PlayerAnswer[];
}

export interface PlayerAnswer {
  playerId: number;
  playerName: string;
  content: string;
  timestamp: string;
}