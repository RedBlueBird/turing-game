// app/api/rooms/[roomCode]/start/route.ts - Start a game
import { NextResponse } from 'next/server';
import pool from '../../../db';

export async function POST(
  request: Request,
  { params }
) {
  try {
    const roomCode = params.roomCode;
    const { hostId } = await request.json();

    // Validate that the request is from the host
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE id = ? AND host_id = ? AND room_state = "waiting"',
      [roomCode, hostId]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Not authorized to start game or game already started' }, { status: 403 });
    }

    const room = roomRows[0];

    // Get players in the room
    const [playerRows]: any = await pool.query(
      'SELECT id FROM players WHERE room_id = ?',
      [roomCode]
    );

    if (playerRows.length < 2) {
      return NextResponse.json({ message: 'Need at least 2 players to start a game' }, { status: 400 });
    }

    // Update room status
    await pool.query(
      'UPDATE rooms SET room_state = "in_progress" WHERE id = ?',
      [roomCode]
    );

    // Select questions for the game based on theme
    const [questionRows]: any = await pool.query(
      'SELECT id FROM questions WHERE theme = ? OR theme = "general" ORDER BY RAND() LIMIT ?',
      [room.theme, room.questions_per_round]
    );

    if (questionRows.length < room.questions_per_round) {
      // If not enough theme-specific questions, get random ones to fill
      const remainingQuestions = room.questions_per_round - questionRows.length;
      const [additionalQuestions]: any = await pool.query(
        'SELECT id FROM questions WHERE theme != ? ORDER BY RAND() LIMIT ?',
        [room.theme, remainingQuestions]
      );
      questionRows.push(...additionalQuestions);
    }

    // Create a new game round
    const [roundResult]: any = await pool.query(
      'INSERT INTO game_rounds (room_id, round_number, room_state) VALUES (?, 1, "pending")',
      [roomCode]
    );

    const roundId = roundResult.insertId;

    // Add questions to the round
    for (let i = 0; i < questionRows.length; i++) {
      await pool.query(
        'INSERT INTO round_questions (round_id, question_id, sequence) VALUES (?, ?, ?)',
        [roundId, questionRows[i].id, i + 1]
      );
    }

    return NextResponse.json({
      roomCode,
      roomState: 'in_progress',
      roundId,
      questionCount: questionRows.length
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ message: 'Error starting game' }, { status: 500 });
  }
}