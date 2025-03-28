import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    await pool.query(
      'INSERT INTO feedbacks (content) VALUES (?)',
      [content]
    );

    return NextResponse.json({ message: 'Feedback submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ message: 'Error submitting feedback' }, { status: 500 });
  }
} 