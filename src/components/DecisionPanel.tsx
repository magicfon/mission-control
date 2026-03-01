'use client';

import { useState, useEffect } from 'react';
import { MessageSquareQuestion, Send, CheckCircle } from 'lucide-react';

interface Decision {
  id: string;
  question: string;
  options: string[];
  createdAt: string;
}

interface DecisionPanelProps {
  taskId: string;
}

export function DecisionPanel({ taskId }: DecisionPanelProps) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchDecision();
  }, [taskId]);

  const fetchDecision = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/decision`);
      const data = await res.json();
      if (data.pending) {
        setDecision({
          id: data.decisionId,
          question: data.question,
          options: data.options || [],
          createdAt: data.createdAt
        });
      }
    } catch (err) {
      console.error('Failed to fetch decision:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption && !customAnswer) return;

    setSubmitting(true);
    try {
      const decision_text = customAnswer || selectedOption;
      const res = await fetch(`/api/tasks/${taskId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: decision_text })
      });

      if (res.ok) {
        setSubmitted(true);
        setDecision(null);
        // Refresh the page to update task status
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to submit decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-mc-text-secondary">
        載入中...
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-mc-accent-green">
        <CheckCircle className="w-12 h-12 mb-2" />
        <p>決策已提交！</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-mc-text-secondary">
        <MessageSquareQuestion className="w-12 h-12 mb-2 opacity-50" />
        <p>目前沒有待決策的問題</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="bg-mc-bg-secondary rounded-lg p-4 border border-mc-border">
        <div className="flex items-start gap-3">
          <MessageSquareQuestion className="w-5 h-5 text-mc-accent-yellow mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-mc-text-primary mb-1">需要決策</h4>
            <p className="text-mc-text-primary">{decision.question}</p>
          </div>
        </div>
      </div>

      {/* Options */}
      {decision.options.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-mc-text-secondary">選擇一個選項：</p>
          {decision.options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedOption(option);
                setCustomAnswer('');
              }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedOption === option
                  ? 'border-mc-accent-blue bg-mc-accent-blue/10 text-mc-text-primary'
                  : 'border-mc-border bg-mc-bg-secondary text-mc-text-primary hover:border-mc-text-secondary'
              }`}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Custom Answer */}
      <div className="space-y-2">
        <p className="text-sm text-mc-text-secondary">或輸入自訂回答：</p>
        <textarea
          value={customAnswer}
          onChange={(e) => {
            setCustomAnswer(e.target.value);
            setSelectedOption(null);
          }}
          placeholder="輸入你的決定..."
          className="w-full px-3 py-2 bg-mc-bg-secondary border border-mc-border rounded-lg text-mc-text-primary placeholder-mc-text-secondary focus:outline-none focus:border-mc-accent-blue resize-none"
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={(!selectedOption && !customAnswer) || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-mc-accent-blue text-white rounded-lg hover:bg-mc-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="w-4 h-4" />
        {submitting ? '提交中...' : '提交決策'}
      </button>
    </div>
  );
}
