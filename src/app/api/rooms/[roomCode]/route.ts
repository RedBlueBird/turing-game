// app/api/rooms/[roomCode]/route.ts - Get room details
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { PlayerData, RoomData, RoomSettings } from '@/configs/interfaces';
import { isValidRoomCode } from '@/lib/util';

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

    // Get parameters from URL
    const { searchParams } = new URL(request.url);
    const includeAI = searchParams.has('includeAI') ? searchParams.get('includeAI') === 'true' : false;
    const nameType = searchParams.has('nameType') ? (searchParams.get('nameType') === 'real' ? 'real' : 'fake') : 'fake';

    // Check if room exists
    const [roomRows]: any = await pool.query(
      'SELECT * FROM rooms WHERE room_code = ? AND expired_at > NOW()',
      [roomCode]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ message: 'Room not found or expired' }, { status: 404 });
    }

    const room = roomRows[0];

    // Get players in the room and include AI if requested
    const [playerRows]: any = await pool.query(
      'SELECT id, fake_name, real_name, join_time, votes, is_lost FROM players WHERE room_id = ? AND leave_time > NOW() ' + 
      (includeAI ? '' : 'AND is_ai = 0 ') + 
      'ORDER BY join_time',
      [room.id]
    );

    // If room state is completed, get game results
    let gameResults = null;
    if (room.room_state === 'completed') {
      const [aiPlayer]: any = await pool.query(
        'SELECT COUNT(*) as count FROM players WHERE room_id = ? AND is_lost = 0 AND is_ai = 1',
        [room.id]
      );
      
      gameResults = {
        aiEliminated: aiPlayer[0].count === 0
      };
    }

    const players: PlayerData[] = [];
    for (let i = 0; i < playerRows.length; i++) {
      const playerData: PlayerData = {
        id: playerRows[i].id,
        fakeName: playerRows[i].fake_name,
        joinTime: playerRows[i].join_time,
        votes: playerRows[i].votes,
        isLost: playerRows[i].is_lost,
      };

      if (nameType === 'real') {
        playerData.realName = playerRows[i].real_name;
      }

      players.push(playerData);
    }
    const roomSettings : RoomSettings = {
      maxPlayers: room.max_players,
      questionsPerRound: room.questions_per_round,
      timePerRound: room.time_per_round,
      timePerVote: room.time_per_vote,
      theme: room.theme,
    }
    const roomData: RoomData = {
      roomId: room.id,
      roomCode: roomCode,
      roomState: room.room_state,
      hostId: room.host_id,
      settings: roomSettings,
      roomRound: room.room_round, 
      roundStartTime: room.round_start_time,
      createdAt: room.created_at,
      expiresAt: room.expired_at,
      players: players,
      ...(room.room_state === 'completed' && gameResults && {
        aiEliminated: gameResults.aiEliminated
      })
    }

    // Return room and players info
    return NextResponse.json(roomData, { status: 201 });
  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json({ message: 'Error getting room details' }, { status: 500 });
  }
}