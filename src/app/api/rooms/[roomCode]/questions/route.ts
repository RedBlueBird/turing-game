import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { searchParams } = new URL(request.url);
    const round = searchParams.get('round') || '1';
    
    // Check if room exists
    const [roomRows]: any = await pool.query(
      'SELECT id, room_state FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];
    
    // Check if room is in progress or completed
    if (room.room_state === 'waiting') {
      return NextResponse.json({ message: 'Game has not started yet' }, { status: 400 });
    }

    // Get questions for the current round
    const [questions]: any = await pool.query(
      `SELECT q.id, q.content, rq.id as room_question_id
       FROM room_questions rq
       JOIN questions q ON rq.question_id = q.id
       WHERE rq.room_id = ? AND rq.room_round = ?
       ORDER BY rq.id`,
      [room.id, round]
    );

    // Get player answers for these questions
    const questionIds = questions.map(q => q.id);
    
    let playerAnswers = [];
    if (questionIds.length > 0) {
      const [answersRows]: any = await pool.query(
        `SELECT pa.question_id, pa.player_id, pa.content, pa.created_at, p.fake_name
         FROM player_answers pa
         JOIN players p ON pa.player_id = p.id
         WHERE pa.question_id IN (?) AND p.room_id = ? AND pa.created_at < NOW()
         ORDER BY pa.created_at`,
        [questionIds, room.id]
      );
      
      playerAnswers = answersRows;
    }

    // Format the data for the client
    const formattedQuestions = questions.map(question => {
      const questionAnswers = playerAnswers
        .filter(answer => answer.question_id === question.id)
        .map(answer => ({
          playerId: answer.player_id,
          playerName: answer.fake_name,
          content: answer.content,
          timestamp: answer.created_at
        }));

      return {
        id: question.id,
        content: question.content,
        playerAnswers: questionAnswers
      };
    });

    return NextResponse.json({
      questions: formattedQuestions
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ message: 'Error fetching questions' }, { status: 500 });
  }
}