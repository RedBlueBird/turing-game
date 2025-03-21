// app/api/rooms/[roomCode]/next-round/route.ts
import { NextResponse } from 'next/server';
import pool from '../../../db';

export async function POST(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
    }

    // Get room data
    const [roomRows]: any = await pool.query(
      'SELECT id, host_id, room_round FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const roomId = roomRows[0].id;
    const hostId = roomRows[0].host_id;
    const currentRound = roomRows[0].room_round;

    // Only host can start next round
    if (playerId !== hostId) {
      return NextResponse.json({ message: 'Only the host can start the next round' }, { status: 403 });
    }

    // Check if any human players are left
    const [humanPlayers]: any = await pool.query(
      'SELECT COUNT(*) as count FROM players WHERE room_id = ? AND is_lost = 0 AND is_ai = 0',
      [roomId]
    );

    // Check if AI player is still in the game
    const [aiPlayer]: any = await pool.query(
      'SELECT COUNT(*) as count FROM players WHERE room_id = ? AND is_lost = 0 AND is_ai = 1',
      [roomId]
    );

    // If game should end (no humans left or AI eliminated)
    if (humanPlayers[0].count <= 1 || aiPlayer[0].count === 0) {
      // Update room state to completed
      await pool.query(
        'UPDATE rooms SET room_state = "completed" WHERE id = ?',
        [roomId]
      );

      return NextResponse.json({ 
        message: 'Game completed',
        gameComplete: true,
        aiEliminated: aiPlayer[0].count === 0,
        humanWinner: humanPlayers[0].count > 0
      }, { status: 200 });
    }

    // Reset votes and voted_player_id for all players in the room
    await pool.query(
      'UPDATE players SET votes = 0, voted_player_id = 0 WHERE room_id = ?',
      [roomId]
    );

    // Increment round and update start time
    await pool.query(
      'UPDATE rooms SET room_round = ?, round_start_time = NOW() WHERE id = ?',
      [currentRound + 1, roomId]
    );

    // Select random questions for the next round
    const [themes]: any = await pool.query(
      'SELECT theme FROM rooms WHERE id = ?',
      [roomId]
    );

    const theme = themes[0].theme;
    const [questionsPerRound]: any = await pool.query(
      'SELECT questions_per_round FROM rooms WHERE id = ?',
      [roomId]
    );

    // Get random questions for the next round
    const [randomQuestions]: any = await pool.query(
      `SELECT id FROM questions 
       WHERE theme = ? 
       AND id NOT IN (
         SELECT question_id FROM room_questions 
         WHERE room_id = ?
       )
       ORDER BY RAND() 
       LIMIT ?`,
      [theme, roomId, questionsPerRound[0].questions_per_round]
    );

    // Insert questions for the new round
    const nextRound = currentRound + 1;
    for (const question of randomQuestions) {
      await pool.query(
        'INSERT INTO room_questions (room_id, room_round, question_id) VALUES (?, ?, ?)',
        [roomId, nextRound, question.id]
      );
    }

    return NextResponse.json({ 
      message: 'Next round started successfully',
      newRound: nextRound
    }, { status: 201 });
  } catch (error) {
    console.error('Error starting next round:', error);
    return NextResponse.json({ message: 'Error starting next round' }, { status: 500 });
  }
}