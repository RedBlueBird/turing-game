// app/api/rooms/[roomCode]/route.ts - Get room details
import { NextResponse } from 'next/server';
import pool from '../../db';
import { PlayerData, RoomData, RoomSettings } from '@/configs/interfaces';

export async function GET(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;

    // Check if room exists
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];

    // Get players in the room
    const [playerRows]: any = await pool.query(
      'SELECT id, real_name, join_time, votes FROM players WHERE room_id = ? AND leave_time > NOW() ORDER BY join_time',
      [room.id]
    );


    const players: PlayerData[] = [];
    for (let i = 0; i < playerRows.length; i++){
      players.push({
        id: playerRows[i].id,
        realName: playerRows[i].real_name,
        joinTime: playerRows[i].join_time,
        votes: playerRows[i].votes,
        isLost: playerRows[i].is_lost,
      });
    }
    const roomSettings : RoomSettings = {
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
      expiresAt: room.expired_at,
      players: players,
    }

    // Return room and players info
    return NextResponse.json(roomData, { status: 201 });
  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json({ message: 'Error getting room details' }, { status: 500 });
  }
}