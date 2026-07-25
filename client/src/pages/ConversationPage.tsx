import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import { useSocket } from '../realtime/SocketContext';
import type { Message } from '../types/message';

const inputClass =
  'flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none';

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const socket = useSocket();
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [liveMessagesId, setLiveMessagesId] = useState(id);
  const [draft, setDraft] = useState('');
  const [socketError, setSocketError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  if (id !== liveMessagesId) {
    setLiveMessagesId(id);
    setLiveMessages([]);
  }

  const historyQuery = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const res = await apiClient.get<{ messages: Message[] }>(`/conversations/${id}/messages`);
      return res.data.messages;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!socket || !id) return;

    function handleNew(message: Message) {
      setLiveMessages((prev) => [...prev, message]);
    }
    function handleError(err: { message: string }) {
      setSocketError(err.message);
    }

    socket.emit('conversation:join', { appointmentId: id });
    socket.on('message:new', handleNew);
    socket.on('conversation:error', handleError);

    return () => {
      socket.off('message:new', handleNew);
      socket.off('conversation:error', handleError);
    };
  }, [socket, id]);

  const history = historyQuery.data ?? [];
  const historyIds = new Set(history.map((message) => message.id));
  const messages = [...history, ...liveMessages.filter((message) => !historyIds.has(message.id))];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!socket || !id || !draft.trim()) return;
    socket.emit('message:send', { appointmentId: id, content: draft.trim() });
    setDraft('');
  };

  if (historyQuery.isLoading) {
    return <p className="text-slate-600">Loading...</p>;
  }

  if (historyQuery.isError) {
    return (
      <p className="text-sm text-rose-600">
        {getErrorMessage(historyQuery.error, 'Unable to load this conversation')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Conversation</h1>
      <Card className="flex h-[28rem] flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet. Say hello!</p>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn ? 'ml-auto bg-teal-600 text-white' : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  {message.content}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        {socketError && <p className="mt-2 text-sm text-rose-600">{socketError}</p>}
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            type="text"
            className={inputClass}
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            disabled={!socket || !draft.trim()}
            className="rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </Card>
    </div>
  );
}
