// app/api/rooms/[roomCode]/votes/route.ts
import { NextResponse } from 'next/server';
import pool from '../../../db';

// GET endpoint to fetch votes for a round
export async function GET(
  request: Request,
  { params }
) {
  try {
    params = await params;
    const roomCode = params.roomCode;

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
    if (roundComplete) {
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

    if (!playerId || !votedPlayerId) {
      return NextResponse.json({ message: 'Player ID and voted player ID are required' }, { status: 400 });
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

    // Update player's voted_player_id to record their vote
    await pool.query(
      'UPDATE players SET voted_player_id = ? WHERE id = ?',
      [votedPlayerId, playerId]
    );

    // Increment vote count for the voted player
    await pool.query(
      'UPDATE players SET votes = votes + 1 WHERE id = ?',
      [votedPlayerId]
    );

    return NextResponse.json({ message: 'Vote recorded successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json({ message: 'Error submitting vote' }, { status: 500 });
  }
}