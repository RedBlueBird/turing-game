// configs/interfaces.ts
export interface PlayerData {
  id: number;
  fakeName?: string;
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
  theme: string;
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