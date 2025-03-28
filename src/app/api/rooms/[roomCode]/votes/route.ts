// app/api/rooms/[roomCode]/votes/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isValidRoomCode } from '@/lib/util';

// GET endpoint to fetch votes for a round
export async function GET(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;

    // Validate room code format
    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json({ message: 'Invalid room code format' }, { status: 400 });
    }

    // Get room ID first
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];

    // Fetch votes using the players table (voter and voted player)
    const [voteRows]: any = await pool.query(
      `SELECT p1.id as voterId, p1.fake_name as voterName, 
              p1.voted_player_id as votedPlayerId, p2.fake_name as votedPlayerName
       FROM players p1
       JOIN players p2 ON p1.voted_player_id = p2.id
       WHERE p1.room_id = ? AND p1.voted_player_id > 0`,
      [room.id]
    );

    // Check if time for voting is over
    const currentTime = new Date().getTime();
    const roundComplete = ((new Date(room.round_start_time).getTime() + (room.time_per_round + room.time_per_vote)*1000 - currentTime) < 0) ? true : false;

    // If round is complete, determine players with highest votes
    let votedPlayers = [];
    let eliminatedPlayer;
    if (roundComplete && room.has_eliminated === 0) {
      // Get vote counts for each player
      const [voteCounts]: any = await pool.query(
        `SELECT id, votes 
         FROM players
         WHERE room_id = ? AND votes > 0
         ORDER BY votes DESC`,
        [room.id]
      );

      // Get highest vote count
      const highestVotes = (voteCounts.length > 0) ? voteCounts[0].votes : 0;
      
      // Find all players with the highest vote count and pick a random player
      votedPlayers = voteCounts
        .filter(vc => vc.votes === highestVotes)
        .map(vc => vc.id);
      eliminatedPlayer = votedPlayers[Math.floor(Math.random() * votedPlayers.length)];
      
      // Update the eliminated players in the database if not already done
      if (eliminatedPlayer) {
        await pool.query(
          'UPDATE players SET is_lost = 1 WHERE id IN (?) AND is_lost = 0',
          [eliminatedPlayer]
        );
        await pool.query(
          'UPDATE rooms SET has_eliminated = 1 WHERE id = ?',
          [room.id]
        );
      }
    }

    return NextResponse.json({
      votes: voteRows,
      roundComplete: roundComplete,
      eliminatedPlayer: eliminatedPlayer,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting votes:', error);
    return NextResponse.json({ message: 'Error getting vote data' }, { status: 500 });
  }
}

// POST endpoint to submit a vote
export async function POST(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;
    const { playerId, votedPlayerId } = await request.json();

    // Validate room code format
    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json({ message: 'Invalid room code format' }, { status: 400 });
    }

    // Validate player IDs
    if (!playerId || !votedPlayerId || 
        !Number.isInteger(Number(playerId)) || Number(playerId) <= 0 ||
        !Number.isInteger(Number(votedPlayerId)) || Number(votedPlayerId) <= 0) {
      return NextResponse.json({ message: 'Invalid player IDs' }, { status: 400 });
    }

    // Additional validation to ensure players are different
    if (playerId === votedPlayerId) {
      return NextResponse.json({ message: 'Cannot vote for yourself' }, { status: 400 });
    }

    // Get room data
    const [roomRows]: any = await pool.query(
      'SELECT id FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const roomId = roomRows[0].id;

    // Check if player has already voted in this round
    const [existingVotes]: any = await pool.query(
      'SELECT id FROM players WHERE id = ? AND voted_player_id > 0',
      [playerId]
    );

    if (existingVotes.length > 0) {
      return NextResponse.json({ message: 'You have already voted in this round' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // Update player's voted_player_id to record their vote
        await connection.execute(
            'UPDATE players SET voted_player_id = ? WHERE id = ?',
            [votedPlayerId, playerId]
        );

        // Increment vote count for the voted player
        await connection.execute(
            'UPDATE players SET votes = votes + 1 WHERE id = ?',
            [votedPlayerId]
        );

        await connection.commit();
        return NextResponse.json({ message: 'Vote submitted successfully' }, { status: 200 });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json({ message: 'Error submitting vote' }, { status: 500 });
  }
}