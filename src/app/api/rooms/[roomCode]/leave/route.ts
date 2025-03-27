// app/api/rooms/[roomCode]/leave/route.ts - Delete room or handle player leaving
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Used when host deletes the room or when a player leaves
export async function PATCH(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { playerId } = await request.json();

    // Validate input
    if (!roomCode || !playerId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // First, get room information
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];

    // Check if the player exists in the room
    const [playerRows]: any = await pool.query(
      'SELECT * FROM players WHERE id = ? AND room_id = ? AND leave_time > NOW()',
      [playerId, room.id]
    );

    if (playerRows.length === 0) {
      return NextResponse.json({ message: 'Player not found in this room' }, { status: 404 });
    }

    const player = playerRows[0];

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // If the player is the host, delete the entire room
      if (room.host_id === playerId) {
        // Make all players in the room leave
        await connection.query(
          'UPDATE players SET leave_time = NOW() WHERE room_id = ?',
          [room.id]
        );

        // Make the room expire
        await connection.query(
          'UPDATE rooms SET room_state = ?, expired_at = NOW() WHERE id = ?',
          ['completed', room.id]
        );

        await connection.commit();
        return NextResponse.json({ message: 'Room deleted successfully' }, { status: 200 });
      } 
      // If the player is not the host, just remove the player
      else {
        // Make the player leave
        await connection.query(
          'UPDATE players SET leave_time = NOW() WHERE id = ?',
          [playerId]
        );

        await connection.commit();
        return NextResponse.json({ message: 'Left room successfully' }, { status: 200 });
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error handling room action:', error);
    return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
  }
}