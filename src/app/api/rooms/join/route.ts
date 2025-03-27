// app/api/rooms/join/route.ts - Join an existing room
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ResultSetHeader } from 'mysql2';
import { PlayerData, RoomData, RoomSettings } from '@/configs/interfaces';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode } = body;

    // Validate input
    if (!roomCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if room exists
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND room_state = "waiting" AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];

    // Check if room is full
    const [playerRows]: any = await pool.query(
      'SELECT COUNT(*) as playerCount FROM players WHERE room_id = ? AND leave_time > NOW() AND is_ai = 0',
      [room.id]
    );

    if (playerRows[0].playerCount >= room.max_players) {
      return NextResponse.json({ message: 'Room is full' }, { status: 400 });
    }

    // Begin transaction with connection
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate player nickname
      const playerName = "Player " + String(playerRows[0].playerCount+1);

      // Add player to the room
      const [insertPlayerResult] = await connection.query(
        'INSERT INTO players (room_id, real_name, leave_time) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
        [room.id, playerName]
      ) as [ResultSetHeader, any];

      await connection.commit();

      const playerData: PlayerData = {
        id: insertPlayerResult.insertId,
        fakeName: 'Placeholder',
        realName: playerName,
        votes: 0,
        isLost: false,
      }
      const roomSettings: RoomSettings = {
        maxPlayers: room.max_players,
        questionsPerRound: room.questions_per_round,
        timePerRound: room.time_per_round,
        timePerVote: room.time_per_vote,
        theme: room.theme,
      }
      const roomData: RoomData = {
        roomId: room.id,
        roomCode: roomCode,
        roomState: room.room_state,
        hostId: room.host_id,
        settings: roomSettings,
        roomRound: room.room_round,
        roundStartTime: room.round_start_time,
        createdAt: room.created_at,
        expiresAt: room.expired_at
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
    console.error('Error joining room:', error);
    return NextResponse.json({ message: 'Error joining room' }, { status: 500 });
  }
}