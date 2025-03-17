// app/api/rooms/[roomCode]/route.ts - Get room details
import { NextResponse } from 'next/server';
import pool from '../../db';

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
      'SELECT id, real_name, join_time, score FROM players WHERE room_id = ? AND leave_time > NOW() ORDER BY join_time',
      [room.id]
    );

    // Return room and players info
    return NextResponse.json({
      players: playerRows,
      room: {
        roomCode: roomCode,
        roomId: room.id,
        roomState: room.room_state,
        maxPlayers: room.max_players,
        questionsPerRound: room.questions_per_round,
        timePerRound: room.time_per_round,
        timePerVote: room.time_per_vote,
        theme: room.theme,
        hostId: room.host_id,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json({ message: 'Error getting room details' }, { status: 500 });
  }
}