import { useState, useCallback, useRef } from 'react';
import { getAccessToken, ApiClient, API_URL } from '@/lib/api-client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
}

export function useChatOrchestrator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await ApiClient.get('/chat/conversations');
      setConversations(data.conversations || []);
      return data.conversations;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }, []);

  const loadConversation = useCallback(async (id: string, onLoaded?: () => void) => {
    setLoadingHistory(true);
    try {
      const data = await ApiClient.get(`/chat/conversations/${id}`);
      setMessages(data.messages || []);
      setConversationId(id);
      if (onLoaded) onLoaded();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await ApiClient.delete(`/chat/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }, [conversationId, startNewChat]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;

    const messageId = Date.now().toString();
    setMessages((prev) => [...prev, { id: messageId, role: 'user', content: userMessage }]);
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const token = await getAccessToken();
      const chatSendUrl = new URL('chat/send', API_URL).toString();
      let response = await fetch(chatSendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 401) {
        const { refreshAccessToken } = await import('@/lib/api-client');
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(chatSendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              conversationId,
              message: userMessage,
            }),
            signal: abortControllerRef.current.signal,
          });
        } else {
          window.location.href = '/auth/login';
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(errorData.message || 'Failed to send message');
      }

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      let assistantMessage = '';
      const reader = response.body?.getReader();

      if (reader) {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('event: token')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  assistantMessage += data.token;
                  setMessages((prev) =>
                    prev.map(msg =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: assistantMessage }
                        : msg
                    )
                  );
                } catch (e) { }
              }
            } else if (part.startsWith('event: complete')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  if (data.conversationId) {
                    setConversationId(data.conversationId);
                    loadConversations();
                  }
                } catch (e) { }
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.error('Error:', error);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'assistant', content: '⚠️ *Connection interrupted. Please try again.*' },
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, loading, loadConversations]);

  return {
    messages,
    conversations,
    conversationId,
    loading,
    loadingHistory,
    loadConversations,
    loadConversation,
    startNewChat,
    deleteConversation,
    sendMessage,
    stopGeneration,
    abortControllerRef
  };
}
