import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/usage/dashboard - HTML Dashboard
export async function GET() {
  try {
    const mcApi = process.env.MISSION_CONTROL_URL || 'http://localhost:4000';
    
    const response = await fetch(`${mcApi}/api/openclaw/status`);
    const data = await response.json();
    
    let modelRows = '';
    let sessionRows = '';
    let summary = {
      totalSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0
    };

    if (data && data.sessions) {
      const modelStats = {};
      
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

        summary.totalSessions++;
        summary.totalInputTokens += session.inputTokens || 0;
        summary.totalOutputTokens += session.outputTokens || 0;
        summary.totalTokens += session.totalTokens || 0;
      });

      Object.values(modelStats).forEach(m => {
        modelRows += `
          <tr>
            <td><code>${m.model}</code></td>
            <td>${m.sessions}</td>
            <td>${m.inputTokens.toLocaleString()}</td>
            <td>${m.outputTokens.toLocaleString()}</td>
            <td><strong>${m.totalTokens.toLocaleString()}</strong></td>
          </tr>
        `;
      });

      data.sessions.sessions.forEach(s => {
        const updated = s.updatedAt ? new Date(s.updatedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : 'N/A';
        sessionRows += `
          <tr>
            <td>${s.displayName || s.key}</td>
            <td><code>${s.modelProvider}/${s.model}</code></td>
            <td>${(s.inputTokens || 0).toLocaleString()}</td>
            <td>${(s.outputTokens || 0).toLocaleString()}</td>
            <td><strong>${(s.totalTokens || 0).toLocaleString()}</strong></td>
            <td>${updated}</td>
          </tr>
        `;
      });
    }

    const connectionStatus = data?.connected 
      ? '<span style="color: #22c55e;">● 已連接</span>' 
      : '<span style="color: #ef4444;">● 未連接</span>';

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Usage Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f; color: #e5e5e5; min-height: 100vh; padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .subtitle { color: #888; margin-bottom: 24px; }
    .status-bar { 
      display: flex; gap: 24px; margin-bottom: 24px; 
      padding: 16px; background: #1a1a1a; border-radius: 8px;
      flex-wrap: wrap;
    }
    .status-item { display: flex; flex-direction: column; }
    .status-label { font-size: 12px; color: #888; margin-bottom: 4px; }
    .status-value { font-size: 24px; font-weight: 600; }
    .status-value.highlight { color: #22c55e; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #a0a0a0; }
    table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #2a2a2a; }
    th { background: #222; font-weight: 500; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #222; }
    code { 
      background: #2a2a2a; padding: 2px 6px; border-radius: 4px; 
      font-family: 'SF Mono', Consolas, monospace; font-size: 13px;
    }
    .refresh-btn {
      position: fixed; top: 20px; right: 20px;
      padding: 8px 16px; background: #333; border: none; border-radius: 6px;
      color: #fff; cursor: pointer; font-size: 14px;
    }
    .refresh-btn:hover { background: #444; }
    .footer { margin-top: 24px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <button class="refresh-btn" onclick="location.reload()">🔄 刷新</button>
  <div class="container">
    <h1>🤖 AI Usage Dashboard</h1>
    <p class="subtitle">監控 AI 模型使用量與 Token 消耗</p>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">Gateway 狀態</span>
        <span class="status-value">${connectionStatus}</span>
      </div>
      <div class="status-item">
        <span class="status-label">活躍 Sessions</span>
        <span class="status-value">${summary.totalSessions}</span>
      </div>
      <div class="status-item">
        <span class="status-label">輸入 Tokens</span>
        <span class="status-value">${summary.totalInputTokens.toLocaleString()}</span>
      </div>
      <div class="status-item">
        <span class="status-label">輸出 Tokens</span>
        <span class="status-value">${summary.totalOutputTokens.toLocaleString()}</span>
      </div>
      <div class="status-item">
        <span class="status-label">總 Tokens</span>
        <span class="status-value highlight">${summary.totalTokens.toLocaleString()}</span>
      </div>
    </div>

    <h2>📊 模型用量統計</h2>
    <table>
      <thead>
        <tr>
          <th>模型</th>
          <th>Sessions</th>
          <th>輸入 Tokens</th>
          <th>輸出 Tokens</th>
          <th>總 Tokens</th>
        </tr>
      </thead>
      <tbody>
        ${modelRows || '<tr><td colspan="5" style="text-align:center;color:#666;">無數據</td></tr>'}
      </tbody>
    </table>

    <h2>📝 Session 詳情</h2>
    <table>
      <thead>
        <tr>
          <th>Session</th>
          <th>模型</th>
          <th>輸入</th>
          <th>輸出</th>
          <th>總計</th>
          <th>更新時間</th>
        </tr>
      </thead>
      <tbody>
        ${sessionRows || '<tr><td colspan="6" style="text-align:center;color:#666;">無數據</td></tr>'}
      </tbody>
    </table>

    <p class="footer">最後更新: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
  </div>
  <script>
    setTimeout(() => location.reload(), 60000);
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('Failed to generate dashboard:', error);
    return new NextResponse('<h1>Error loading dashboard</h1>', { status: 500 });
  }
}
