import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import { broadcast } from '@/lib/events';

export const dynamic = 'force-dynamic';

// POST /api/tasks/[id]/decision/request - Create a decision request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { question, options } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Check task exists
    const task = queryOne<{ id: string; status: string; title: string }>(
      'SELECT id, status, title FROM tasks WHERE id = ?',
      [id]
    );

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Create decision request in task_activities
    const activityId = uuidv4();
    run(
      `INSERT INTO task_activities (id, task_id, activity_type, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        activityId,
        id,
        'decision_required',
        question,
        JSON.stringify({ question, options: options || [] }),
        now
      ]
    );

    // Broadcast via SSE
    broadcast({
      type: 'decision_required',
      payload: {
        taskId: id,
        taskTitle: task.title,
        question,
        options: options || [],
        decisionId: activityId
      }
    });

    return NextResponse.json({
      success: true,
      decisionId: activityId,
      taskId: id,
      message: 'Decision request created'
    });
  } catch (error) {
    console.error('Failed to create decision request:', error);
    return NextResponse.json({ error: 'Failed to create decision request' }, { status: 500 });
  }
}
