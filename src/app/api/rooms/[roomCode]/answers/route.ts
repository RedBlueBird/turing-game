import { NextResponse } from 'next/server';
import pool from '../../../db';

export async function POST(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { playerId, questionId, answer } = await request.json();
    
    // Validate input
    if (!playerId || !questionId || !answer) {
      return NextResponse.json({ message: 'Player ID, question ID, and answer are required' }, { status: 400 });
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

    if (existingAnswerRows.length > 0) {
      // Update existing answer
      await pool.query(
        'UPDATE player_answers SET content = ? WHERE player_id = ? AND question_id = ?',
        [answer, playerId, questionId]
      );
    } else {
      // Insert new answer
      await pool.query(
        'INSERT INTO player_answers (player_id, question_id, content) VALUES (?, ?, ?)',
        [playerId, questionId, answer]
      );
    }

    return NextResponse.json({
      message: 'Answer submitted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ message: 'Error submitting answer' }, { status: 500 });
  }
}