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
    
    // Validate input
    if (!playerId) {
      return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
    }

    // Check if room exists
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];
    
    // Check if player is the host
    if (room.host_id !== parseInt(playerId)) {
      return NextResponse.json({ message: 'Only the host can start the game' }, { status: 403 });
    }
    
    // Check if room is in waiting state
    if (room.room_state !== 'waiting') {
      return NextResponse.json({ message: 'Game has already started or completed' }, { status: 400 });
    }

    // Check if there are enough players (minimum 2)
    const [playerCountRows]: any = await pool.query(
      'SELECT COUNT(*) as playerCount FROM players WHERE room_id = ? AND leave_time > NOW()',
      [room.id]
    );
    
    const playerCount = playerCountRows[0].playerCount;
    if (playerCount < 2) {
      return NextResponse.json({ message: 'Need at least 2 players to start the game' }, { status: 400 });
    }

    // Select questions for the game based on the theme and questions_per_round
    const [availableQuestionsRows]: any = await pool.query(
      'SELECT id FROM questions WHERE theme = ? ORDER BY RAND() LIMIT ?',
      [room.theme, room.questions_per_round]
    );
    
    if (availableQuestionsRows.length < room.questions_per_round) {
      return NextResponse.json({ 
        message: `Not enough questions available for theme '${room.theme}'` 
      }, { status: 400 });
    }

    // Begin a transaction to ensure all operations complete together
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update room state to in_progress
      await connection.query(
        'UPDATE rooms SET room_state = ?, room_round = 1, round_start_time = NOW() WHERE id = ?',
        ['in_progress', room.id]
      );
      
      // Insert selected questions into room_questions for round 1
      for (const question of availableQuestionsRows) {
        await connection.query(
          'INSERT INTO room_questions (room_id, room_round, question_id) VALUES (?, ?, ?)',
          [room.id, 1, question.id]
        );
      }
      
      await connection.commit();
      
      return NextResponse.json({
        message: 'Game started successfully',
        roomState: 'in_progress',
        roundNumber: 1,
        questionsCount: availableQuestionsRows.length
      }, { status: 200 });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ message: 'Error starting game' }, { status: 500 });
  }
}