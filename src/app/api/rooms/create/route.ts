// app/api/rooms/create/route.ts - Create a new room
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ResultSetHeader } from 'mysql2';
import { PlayerData, RoomData, RoomSettings } from '@/configs/interfaces';

// Function to generate a random 4-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitting similar looking characters
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { maxPlayers, questionsPerRound, timePerRound, timePerVote, theme } = body;

    // Validate input
    if (!maxPlayers || !questionsPerRound || !timePerRound || !timePerVote || !theme) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique room code
    let roomCode;
    let isUnique = false;
    
    while (!isUnique) {
      roomCode = generateRoomCode();
      
      // Check if code already exists
      const [rows]: any = await pool.query(
        'SELECT id FROM rooms WHERE room_code = ? AND expired_at > NOW()',
        [roomCode]
      );
      
      if (rows.length === 0) {
        isUnique = true;
      }
    }

    // Begin transaction with connection
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // Create the room
        const [insertRoomResult] = await connection.query(
            'INSERT INTO rooms (room_code, max_players, questions_per_round, time_per_round, time_per_vote, theme, expired_at) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
            [roomCode, maxPlayers, questionsPerRound, timePerRound, timePerVote, theme]
        ) as [ResultSetHeader, any];

        const roomId = insertRoomResult.insertId;
        const hostName = "Player 1";

        // Add the host as first player
        const [insertPlayerResult] = await connection.query(
            'INSERT INTO players (room_id, real_name, leave_time) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
            [roomId, hostName]
        ) as [ResultSetHeader, any];
        const hostId = insertPlayerResult.insertId;

        // Add the AI as the second player
        const [insertAiResult] = await connection.query(
          'INSERT INTO players (room_id, real_name, leave_time, is_ai) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), ?)',
          [roomId, "AI Player", true]
        ) as [ResultSetHeader, any];
        const aiId = insertAiResult.insertId;

        // Add the host and AI as the host and AI of the room
        await connection.query(
            'UPDATE rooms SET host_id = ?, ai_id = ? WHERE id = ?',
            [hostId, aiId, roomId]
        );

        await connection.commit();

        const playerData: PlayerData = {
            id: insertPlayerResult.insertId,
            fakeName: 'Placeholder',
            realName: hostName,
            votes: 0,
            isLost: false,
        }
        const roomSettings: RoomSettings = {
            maxPlayers: maxPlayers,
            questionsPerRound: questionsPerRound,
            timePerRound: timePerRound,
            timePerVote: timePerVote,
            theme: theme,
        }
        const roomData: RoomData = {
            roomId: roomId,
            roomCode: roomCode,
            roomState: 'waiting',
            hostId: hostId,
            settings: roomSettings,
            roomRound: 0,
        }

        return NextResponse.json({
            playerData: playerData,
            roomData: roomData
        }, { status: 201 });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ message: 'Error creating room' }, { status: 500 });
  }
}
