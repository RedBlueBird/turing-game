import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isValidRoomCode } from '@/lib/util';

export async function POST(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { playerId, questionId, answer } = await request.json();
    
    // Validate input presence
    if (!playerId || !questionId || !answer) {
      return NextResponse.json({ message: 'Player ID, question ID, and answer are required' }, { status: 400 });
    }

    // Validate integers
    if (!Number.isInteger(Number(playerId)) || Number(playerId) <= 0) {
      return NextResponse.json({ message: 'Invalid player ID' }, { status: 400 });
    }

    if (!Number.isInteger(Number(questionId)) || Number(questionId) <= 0) {
      return NextResponse.json({ message: 'Invalid question ID' }, { status: 400 });
    }

    // Validate answer length and type
    if (typeof answer !== 'string' || answer.length > 200) {
      return NextResponse.json({ message: 'Answer must be a string with maximum length of 200 characters' }, { status: 400 });
    }
    
    // Validate room code format
    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json({ message: 'Invalid room code format' }, { status: 400 });
    }

    // Check if room exists and is in progress
    const [roomRows]: any = await pool.query(
      'SELECT id, room_state FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];
    
    // Check if room is in progress
    if (room.room_state !== 'in_progress') {
      return NextResponse.json({ message: 'Room is not in progress' }, { status: 400 });
    }

    // Check if player exists in the room
    const [playerRows]: any = await pool.query(
      'SELECT id FROM players WHERE id = ? AND room_id = ? AND leave_time > NOW()',
      [playerId, room.id]
    );

    if (playerRows.length === 0) {
      return NextResponse.json({ message: 'Player not found in this room' }, { status: 404 });
    }

    // Check if question exists and belongs to the room
    const [questionRows]: any = await pool.query(
      'SELECT rq.id FROM room_questions rq ' +
      'JOIN questions q ON rq.question_id = q.id ' +
      'WHERE q.id = ? AND rq.room_id = ?',
      [questionId, room.id]
    );

    if (questionRows.length === 0) {
      return NextResponse.json({ message: 'Question not found in this room' }, { status: 404 });
    }

    // Check if the player has already answered this question
    const [existingAnswerRows]: any = await pool.query(
      'SELECT id FROM player_answers WHERE player_id = ? AND question_id = ?',
      [playerId, questionId]
    );

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if (existingAnswerRows.length > 0) {
        // Update existing answer using parameterized query
        await connection.execute(
          'UPDATE player_answers SET content = ? WHERE player_id = ? AND question_id = ?',
          [answer, playerId, questionId]
        );
      } else {
        // Insert new answer using parameterized query
        await connection.execute(
          'INSERT INTO player_answers (player_id, question_id, content) VALUES (?, ?, ?)',
          [playerId, questionId, answer]
        );
      }

      await connection.commit();
      return NextResponse.json({ message: 'Answer submitted successfully' }, { status: 200 });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ message: 'Error submitting answer' }, { status: 500 });
  }
}