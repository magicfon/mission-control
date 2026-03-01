import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import { broadcast } from '@/lib/events';

export const dynamic = 'force-dynamic';

// POST /api/tasks/[id]/decision - Record a decision and resume task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { decision, decided_by } = body;

    if (!decision) {
      return NextResponse.json({ error: 'Decision is required' }, { status: 400 });
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

    // Record the decision in task_activities
    const activityId = uuidv4();
    run(
      `INSERT INTO task_activities (id, task_id, activity_type, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        activityId,
        id,
        'decision_made',
        `Decision: ${decision}`,
        JSON.stringify({ decision, decided_by: decided_by || 'user' }),
        now
      ]
    );

    // Broadcast decision via SSE
    broadcast({
      type: 'task_decision',
      payload: {
        taskId: id,
        decision,
        decided_by: decided_by || 'user'
      }
    });

    return NextResponse.json({
      success: true,
      taskId: id,
      decision,
      message: 'Decision recorded. Task can now continue.'
    });
  } catch (error) {
    console.error('Failed to record decision:', error);
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 });
  }
}

// GET /api/tasks/[id]/decision - Get pending decision for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the latest pending decision
    const activity = queryOne<{
      id: string;
      task_id: string;
      activity_type: string;
      message: string;
      metadata: string;
      created_at: string;
    }>(
      `SELECT * FROM task_activities 
       WHERE task_id = ? AND activity_type = 'decision_required'
       AND id NOT IN (
         SELECT JSON_EXTRACT(metadata, '$.decision_id') 
         FROM task_activities 
         WHERE task_id = ? AND activity_type = 'decision_made'
       )
       ORDER BY created_at DESC LIMIT 1`,
      [id, id]
    );

    if (!activity) {
      return NextResponse.json({ pending: false });
    }

    const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};

    return NextResponse.json({
      pending: true,
      question: metadata.question || activity.message,
      options: metadata.options || [],
      decisionId: activity.id,
      createdAt: activity.created_at
    });
  } catch (error) {
    console.error('Failed to get pending decision:', error);
    return NextResponse.json({ error: 'Failed to get pending decision' }, { status: 500 });
  }
}
