import { ModelInfo, Services, ChatMessage } from '../types';
import { extractTextFromData, generateId } from '../utils';

export class AIService {
  private services: Services;
  private currentUserId: string | null = null;

  constructor(services: Services) {
    this.services = services;
    this.initializeUserId();
  }

  /**
   * Initialize current user ID
   */
  private async initializeUserId() {
    try {
      if (this.services?.api) {
        const response = await this.services.api.get('/api/v1/auth/me');
        if (response && response.id) {
          this.currentUserId = response.id;
        }
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
  }

  /**
   * Send prompt to AI provider and handle response
   */
  async sendPrompt(
    prompt: string,
    selectedModel: ModelInfo,
    useStreaming: boolean,
    conversationId: string | null,
    conversationType: string = "chat",
    onChunk: (chunk: string) => void,
    onConversationId: (id: string) => void
  ): Promise<boolean> {
    if (!this.services?.api) {
      throw new Error('API service not available');
    }

    // Create chat messages array with user's prompt
    const messages = [
      { role: "user", content: prompt }
    ];

    // Use only the production endpoint
    const endpoint = '/api/v1/ai/providers/chat';

    // Create request params for production endpoint
    const requestParams = {
      provider: selectedModel.provider || 'ollama',
      settings_id: selectedModel.providerId || 'ollama_servers_settings',
      server_id: selectedModel.serverId,
      model: selectedModel.name,
      messages: messages.map(msg => ({
        role: msg.role || 'user',
        content: msg.content
      })),
      params: {
        temperature: 0.7,
        max_tokens: 2048
      },
      stream: useStreaming,
      user_id: this.currentUserId || 'current',
      conversation_id: conversationId,
      conversation_type: conversationType
    };

    try {
      let success = false;

      if (useStreaming && typeof this.services?.api?.postStreaming === 'function') {
        // Handle streaming
        try {
          await this.services.api.postStreaming(
            endpoint,
            requestParams,
            (chunk: string) => {
              try {
                // Handle Server-Sent Events format - remove 'data: ' prefix if present
                let jsonString = chunk;
                if (chunk.startsWith('data: ')) {
                  jsonString = chunk.substring(6); // Remove 'data: ' prefix
                }
                
                // Skip empty chunks or [DONE] markers
                if (!jsonString.trim() || jsonString.trim() === '[DONE]') {
                  return;
                }

                const data = JSON.parse(jsonString);

                // Store the conversation_id if it's in the response
                if (data.conversation_id && !conversationId) {
                  onConversationId(data.conversation_id);
                }

                const chunkText = extractTextFromData(data);
                if (chunkText) {
                  onChunk(chunkText);
                }
              } catch (error) {
                console.error('Error processing streaming chunk:', error);
              }
            },
            {
              timeout: 120000
            }
          );
          success = true;
        } catch (error) {
          console.error('Streaming error:', error);
          throw error;
        }
      } else {
        // Handle non-streaming
        try {
          const response = await this.services.api.post(endpoint, requestParams, { timeout: 60000 });
          const responseData = response.data || response;

          // Store the conversation_id if it's in the response
          if (responseData.conversation_id && !conversationId) {
            onConversationId(responseData.conversation_id);
          }

          const responseText = extractTextFromData(responseData);
          if (responseText) {
            onChunk(responseText);
            success = true;
          } else {
            throw new Error('No response text received');
          }
        } catch (error) {
          console.error('Non-streaming error:', error);
          throw error;
        }
      }

      return success;
    } catch (error) {
      console.error('Error in sendPrompt:', error);
      onChunk(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      return false;
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}