// app/api/rooms/[roomCode]/next-round/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAzureAICompletion } from '@/lib/azure-ai-completion';

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

    const room = roomRows[0];
    const currentRound = roomRows[0].room_round;

    // Only host can start next round
    if (playerId !== room.host_id) {
      return NextResponse.json({ message: 'Only the host can start the next round' }, { status: 403 });
    }

    // Check if any human players are left
    const [humanPlayers]: any = await pool.query(
      'SELECT id FROM players WHERE room_id = ? AND is_lost = 0 AND is_ai = 0',
      [room.id]
    );

    // Check if AI player is still in the game
    const [aiPlayer]: any = await pool.query(
      'SELECT id FROM players WHERE room_id = ? AND is_lost = 0 AND is_ai = 1',
      [room.id]
    );

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // If game should end (no humans left or AI eliminated)
      if (humanPlayers.length <= 1 || aiPlayer.length === 0) {
        // Update room state to completed
        await connection.query(
          'UPDATE rooms SET room_state = "completed" WHERE id = ?',
          [room.id]
        );

        console.log({ 
          message: 'Game completed',
          gameComplete: true,
          aiEliminated: aiPlayer.length === 0,
          humanWinner: humanPlayers.length > 0
        });

        await connection.commit();
        return NextResponse.json({ 
          message: 'Game completed',
          gameComplete: true,
          aiEliminated: aiPlayer.length === 0,
          humanWinner: humanPlayers.length > 0
        }, { status: 200 });
      }

      // Reset votes and voted_player_id for all players in the room
      await connection.query(
        'UPDATE players SET votes = 0, voted_player_id = 0 WHERE room_id = ?',
        [room.id]
      );

      // Increment round and update start time
      await connection.query(
        'UPDATE rooms SET room_round = ?, round_start_time = NOW(), has_eliminated = 0 WHERE id = ?',
        [currentRound + 1, room.id]
      );

      // Select random questions for the next round
      const [themes]: any = await connection.query(
        'SELECT theme FROM rooms WHERE id = ?',
        [room.id]
      );

      const theme = themes[0].theme;
      const [questionsPerRound]: any = await connection.query(
        'SELECT questions_per_round FROM rooms WHERE id = ?',
        [room.id]
      );

      // Get random questions for the next round
      const [randomQuestions]: any = await connection.query(
        `SELECT id FROM questions 
         WHERE theme = ? 
         AND id NOT IN (
           SELECT question_id FROM room_questions 
           WHERE room_id = ?
         )
         ORDER BY RAND() 
         LIMIT ?`,
        [theme, room.id, questionsPerRound[0].questions_per_round]
      );

      // Insert questions for the new round
      const nextRound = currentRound + 1;
      for (const question of randomQuestions) {
        await connection.query(
          'INSERT INTO room_questions (room_id, room_round, question_id) VALUES (?, ?, ?)',
          [room.id, nextRound, question.id]
        );
      }

      // Increase the views of each selected question by 1
      for (const question of randomQuestions) {
        await connection.query(
          'UPDATE questions SET views = views + 1 WHERE id = ?',
          [question.id]
        );
      }

      // Insert AI answers into player_answers for the next round 
      let aiAnswers = [];
      let createdAt = new Date();
      for (const question of randomQuestions) {
        const result = await getAzureAICompletion(question.content);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status });
        }
        // Add random seconds to createdAt to mimic human typing
        let threshold = result.result.length / 10;
        createdAt.setSeconds(createdAt.getSeconds() + Math.floor(Math.random() * (room.time_per_round / room.questions_per_round - threshold) + threshold));
        aiAnswers.push({result: result.result, questionId: question.id, createdAt: createdAt});
      }
      for (const answer of aiAnswers) {
        // Truncate to last complete word within 200 characters 
        let truncatedAnswer = answer.result.slice(0, 200);
        if (answer.result.length > 200) {
          truncatedAnswer = truncatedAnswer.slice(0, truncatedAnswer.lastIndexOf(' '));
        }
        await connection.query(
          'INSERT INTO player_answers (player_id, question_id, content, created_at) VALUES (?, ?, ?, ?)',
          [room.ai_id, answer.questionId, truncatedAnswer, answer.createdAt]
        );
      }

      // Let AI vote a random player
      const randomPlayerId = humanPlayers[Math.floor(Math.random() * humanPlayers.length)].id;
      await connection.query(
        'UPDATE players SET votes = votes + 1 WHERE id = ?',
        [randomPlayerId]
      );
      await connection.query(
        'UPDATE players SET voted_player_id = ? WHERE id = ?',
        [randomPlayerId, room.ai_id]
      );

      await connection.commit();

      return NextResponse.json({ 
        message: 'Next round started successfully',
        roundNumber: nextRound
      }, { status: 200 });

    } catch (error) {
      await connection.rollback();
      console.error('Error processing next round:', error);
      return NextResponse.json({ message: 'Error processing next round' }, { status: 500 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error starting next round:', error);
    return NextResponse.json({ message: 'Error starting next round' }, { status: 500 });
  }
}