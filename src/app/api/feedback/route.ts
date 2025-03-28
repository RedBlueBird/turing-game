import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    // Validate input presence
    if (!content) {
      return NextResponse.json({ message: 'Feedback content is required' }, { status: 400 });
    }

    // Validate content type and length
    if (typeof content !== 'string' || content.length > 1000) {
      return NextResponse.json({ 
        message: 'Feedback must be a string with maximum length of 1000 characters' 
      }, { status: 400 });
    }

    // Get connection and start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert feedback using parameterized query
      await connection.execute(
        'INSERT INTO feedbacks (content) VALUES (?)',
        [content]
      );

      await connection.commit();
      return NextResponse.json({ message: 'Feedback submitted successfully' }, { status: 201 });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ message: 'Error submitting feedback' }, { status: 500 });
  }
} 