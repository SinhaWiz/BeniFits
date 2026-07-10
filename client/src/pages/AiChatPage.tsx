import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiClient, baseURL } from '../lib/apiClient';
import { getAccessToken } from '../lib/tokenStore';
import type { AiChatMessage } from '../types/aiChat';

async function streamChatMessage(message: string, onDelta: (text: string) => void): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${baseURL}/ai/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    let errorMessage = 'Unable to reach the AI assistant';
    try {
      const data = await response.json();
      if (data?.error) errorMessage = data.error;
    } catch {
      // no JSON body; use the default message
    }
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      const payload = JSON.parse(line.slice('data:'.length).trim());
      if (payload.delta) onDelta(payload.delta);
      if (payload.error) throw new Error(payload.error);
      if (payload.done) return;
    }
  }
}

export default function AiChatPage() {
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const historyQuery = useQuery({
    queryKey: ['aiChat'],
    queryFn: async () => {
      const res = await apiClient.get<{ messages: AiChatMessage[] }>('/ai/chat');
      return res.data.messages;
    },
  });

  const messages = [...(historyQuery.data ?? []), ...pendingMessages];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/ai/chat');
    },
    onSuccess: () => {
      setPendingMessages([]);
      setErrorText(null);
      queryClient.invalidateQueries({ queryKey: ['aiChat'] });
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    setErrorText(null);
    setDraft('');
    setIsSending(true);

    const assistantId = `temp-assistant-${Date.now()}`;
    setPendingMessages([
      {
        id: `temp-user-${Date.now()}`,
        conversationId: 'local',
        role: 'USER',
        content: text,
        createdAt: new Date().toISOString(),
      },
      {
        id: assistantId,
        conversationId: 'local',
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await streamChatMessage(text, (delta) => {
        setPendingMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
        );
      });
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSending(false);
      // Wait for the persisted history to refetch before clearing the
      // locally-streamed messages, so the just-sent exchange never
      // disappears from view between the two.
      await queryClient.invalidateQueries({ queryKey: ['aiChat'] });
      setPendingMessages([]);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Nutritionist</h1>
          <button
            type="button"
            onClick={() => clearMutation.mutate()}
            className="text-sm text-slate-300 hover:text-white"
          >
            Start over
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Not medical advice. For symptoms or medical concerns, consult a healthcare professional.
        </p>
      </section>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/40 p-6">
        {historyQuery.isLoading && <p className="text-slate-300">Loading...</p>}
        {!historyQuery.isLoading && messages.length === 0 && (
          <p className="text-slate-400">
            Ask me anything about nutrition, meals, or healthy eating.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'USER' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'USER'
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              {message.content || (message.role === 'ASSISTANT' && isSending ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {errorText && <p className="mt-2 text-sm text-rose-400">{errorText}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a nutrition question..."
          className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
