import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAzureAICompletion } from '@/lib/azure-ai-completion';
import fakename from '@/data/fakename.json';
import { shuffle, isValidRoomCode } from '@/lib/util';

export async function POST(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { playerId } = await request.json();
    
    // Validate room code format
    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json({ message: 'Invalid room code format' }, { status: 400 });
    }

    // Validate player ID
    if (!playerId || !Number.isInteger(Number(playerId)) || Number(playerId) <= 0) {
      return NextResponse.json({ message: 'Invalid player ID' }, { status: 400 });
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
    const [playerRows]: any = await pool.query(
      'SELECT id FROM players WHERE room_id = ? AND leave_time > NOW() AND is_ai = 0',
      [room.id]
    );
    
    const playerCount = playerRows.length;
    if (playerCount < 2) {
      return NextResponse.json({ message: 'Need at least 2 players to start the game' }, { status: 400 });
    }

    // Select questions for the game based on the theme and questions_per_round
    const [availableQuestionsRows]: any = await pool.query(
      'SELECT id, content FROM questions WHERE theme = ? ORDER BY RAND() LIMIT ?',
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
      await connection.execute(
        'UPDATE rooms SET room_state = ?, room_round = 1, round_start_time = NOW() WHERE id = ?',
        ['in_progress', room.id]
      );
      
      // Update random names for all players in the room
      const shuffledNames = shuffle(fakename.names);
      let playerNameUpdates = playerRows.map((player, index) => ({
        id: player.id,
        name: shuffledNames[index]
      }));
      playerNameUpdates.push({id: room.ai_id, name: shuffledNames[playerRows.length]});
      const caseStatements = playerNameUpdates.map(update => 
        `WHEN id = ${connection.escape(update.id)} THEN ${connection.escape(update.name)}`
      ).join(' ');
      await connection.execute(`
        UPDATE players 
        SET fake_name = CASE 
          ${caseStatements}
          ELSE fake_name 
        END
        WHERE id IN (${playerNameUpdates.map(u => connection.escape(u.id)).join(',')})
      `);

      // Insert selected questions into room_questions for round 1
      for (const question of availableQuestionsRows) {
        await connection.execute(
          'INSERT INTO room_questions (room_id, room_round, question_id) VALUES (?, ?, ?)',
          [room.id, 1, question.id]
        );
      }

      // Increase the views of each selected question by 1
      for (const question of availableQuestionsRows) {
        await connection.execute(
          'UPDATE questions SET views = views + 1 WHERE id = ?',
          [question.id]
        );
      }

      // Insert AI answers into player_answers for round 1
      let aiAnswers = [];
      let createdAt = new Date();
      for (const question of availableQuestionsRows) {
        const result = await getAzureAICompletion(question.content, {mimicRole: room.mimic_role});
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status });
        }
        // Add random seconds to createdAt to mimic human typing
        let threshold = result.result.length / 10;
        createdAt.setSeconds(createdAt.getSeconds() + Math.floor(Math.random() * (Math.min(room.time_per_round / room.questions_per_round, 60) - threshold) + threshold));
        aiAnswers.push({result: result.result, questionId: question.id, createdAt: createdAt});
      }
      for (const answer of aiAnswers) {
        // Truncate to last complete word within 200 characters
        let truncatedAnswer = answer.result.slice(0, 200);
        if (answer.result.length > 200) {
          truncatedAnswer = truncatedAnswer.slice(0, truncatedAnswer.lastIndexOf(' '));
        }
        await connection.execute(
          'INSERT INTO player_answers (player_id, question_id, content, created_at) VALUES (?, ?, ?, ?)',
          [room.ai_id, answer.questionId, truncatedAnswer, answer.createdAt]
        );
      }

      // Let AI vote a random player
      const randomPlayerId = playerRows[Math.floor(Math.random() * playerRows.length)].id;
      await connection.execute(
        'UPDATE players SET votes = votes + 1 WHERE id = ?',
        [randomPlayerId]
      );
      await connection.execute(
        'UPDATE players SET voted_player_id = ? WHERE id = ?',
        [randomPlayerId, room.ai_id]
      );

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