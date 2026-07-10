export type AiChatRole = 'USER' | 'ASSISTANT';

export interface AiChatMessage {
  id: string;
  conversationId: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
}
