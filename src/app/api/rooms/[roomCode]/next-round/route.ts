// app/api/rooms/[roomCode]/next-round/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAzureAICompletion } from '@/lib/azure-ai-completion';
import { isValidRoomCode } from '@/lib/util';

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

    // Get room data
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND expired_at > NOW()',
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
        await connection.execute(
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

      console.log("------------1-------");

      // Reset votes and voted_player_id for all players in the room
      await connection.execute(
        'UPDATE players SET votes = 0, voted_player_id = 0 WHERE room_id = ?',
        [room.id]
      );

      console.log("------------2-------");

      // Increment round and update start time
      await connection.execute(
        'UPDATE rooms SET room_round = ?, round_start_time = NOW(), has_eliminated = 0 WHERE id = ?',
        [currentRound + 1, room.id]
      );

      console.log("------------3-------");  

      // Get random questions for the next round
      const [randomQuestions]: any = await connection.query(
        `SELECT * FROM questions 
         WHERE theme = ? 
         AND id NOT IN (
           SELECT question_id FROM room_questions 
           WHERE room_id = ?
         )
         ORDER BY RAND() 
         LIMIT ?`,
        [room.theme, room.id, room.questions_per_round]
      );

      console.log("------------4-------");

      // Insert questions for the new round
      const nextRound = currentRound + 1;
      for (const question of randomQuestions) {
        await connection.execute(
          'INSERT INTO room_questions (room_id, room_round, question_id) VALUES (?, ?, ?)',
          [room.id, nextRound, question.id]
        );
      }

      console.log("------------5-------");

      // Increase the views of each selected question by 1
      for (const question of randomQuestions) {
        await connection.execute(
          'UPDATE questions SET views = views + 1 WHERE id = ?',
          [question.id]
        );
      }

      console.log("------------6-------");

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
        await connection.execute(
          'INSERT INTO player_answers (player_id, question_id, content, created_at) VALUES (?, ?, ?, ?)',
          [room.ai_id, answer.questionId, truncatedAnswer, answer.createdAt]
        );
      }

      console.log("------------7-------");

      // Let AI vote a random player
      const randomPlayerId = humanPlayers[Math.floor(Math.random() * humanPlayers.length)].id;
      await connection.execute(
        'UPDATE players SET votes = votes + 1 WHERE id = ?',
        [randomPlayerId]
      );

      console.log("------------8-------");

      await connection.execute(
        'UPDATE players SET voted_player_id = ? WHERE id = ?',
        [randomPlayerId, room.ai_id]
      );

      console.log("------------9-------");

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