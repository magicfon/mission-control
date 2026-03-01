import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/usage - Get AI model and token usage
export async function GET() {
  try {
    const mcApi = process.env.MISSION_CONTROL_URL || 'http://localhost:4000';
    
    // Fetch OpenClaw status
    const response = await fetch(`${mcApi}/api/openclaw/status`);
    const data = await response.json();
    
    if (!data.sessions || !data.sessions.sessions) {
      return NextResponse.json({
        connected: false,
        error: 'No session data available',
        models: [],
        summary: {
          totalSessions: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0
        },
        sessions: []
      });
    }

    // Aggregate by model
    const modelStats = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    data.sessions.sessions.forEach(session => {
      const model = `${session.modelProvider}/${session.model}`;
      if (!modelStats[model]) {
        modelStats[model] = {
          model,
          sessions: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        };
      }
      modelStats[model].sessions++;
      modelStats[model].inputTokens += session.inputTokens || 0;
      modelStats[model].outputTokens += session.outputTokens || 0;
      modelStats[model].totalTokens += session.totalTokens || 0;

      totalInputTokens += session.inputTokens || 0;
      totalOutputTokens += session.outputTokens || 0;
      totalTokens += session.totalTokens || 0;
    });

    const result = {
      connected: data.connected,
      models: Object.values(modelStats),
      summary: {
        totalSessions: data.sessions.count,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        updatedAt: new Date().toISOString()
      },
      sessions: data.sessions.sessions.map(s => ({
        key: s.key,
        kind: s.kind,
        displayName: s.displayName,
        model: `${s.modelProvider}/${s.model}`,
        inputTokens: s.inputTokens,
        outputTokens: s.outputTokens,
        totalTokens: s.totalTokens,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null
      }))
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch usage data:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}
// Build trigger Sun Mar  1 13:25:56 UTC 2026
