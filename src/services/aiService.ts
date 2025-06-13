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
      if (this.services.api) {
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
    onChunk: (chunk: string) => void,
    onConversationId: (id: string) => void
  ): Promise<boolean> {
    if (!this.services.api) {
      throw new Error('API service not available');
    }

    // Create chat messages array with user's prompt
    const messages = [
      { role: "user", content: prompt }
    ];

    // Define endpoints
    const productionEndpoint = '/api/v1/ai/providers/chat';
    const testEndpoint = '/api/v1/ai/providers/test/ollama/chat';

    // Create production request params
    const productionRequestParams = {
      provider: selectedModel.provider || 'ollama',
      settings_id: selectedModel.providerId || 'ollama_servers_settings',
      server_id: selectedModel.serverId || 'server_1538843993_8e87ea7654',
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
      conversation_id: conversationId
    };

    // Create test request params as fallback
    const testRequestParams = {
      messages: messages,
      model: selectedModel.name,
      stream: useStreaming,
      temperature: 0.7,
      max_tokens: 2048,
      server_url: "http://localhost:11434"
    };

    try {
      // Define a function to handle streaming
      const handleStreaming = async (endpointUrl: string, params: any): Promise<boolean> => {
        try {
          if (!this.services.api?.postStreaming) {
            throw new Error('postStreaming method not available');
          }

          await this.services.api.postStreaming(
            endpointUrl,
            params,
            (chunk: string) => {
              try {
                const data = JSON.parse(chunk);

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

          return true;
        } catch (error) {
          console.error('Streaming error:', error);
          return false;
        }
      };

      // Define a function to handle non-streaming
      const handleNonStreaming = async (endpointUrl: string, params: any): Promise<boolean> => {
        try {
          if (!this.services.api?.post) {
            throw new Error('post method not available');
          }

          const response = await this.services.api.post(endpointUrl, params, { timeout: 60000 });

          const responseData = response.data || response;

          // Store the conversation_id if it's in the response
          if (responseData.conversation_id && !conversationId) {
            onConversationId(responseData.conversation_id);
          }

          let responseText = extractTextFromData(responseData);

          if (responseText) {
            onChunk(responseText);
            return true;
          } else {
            return false;
          }
        } catch (error) {
          console.error('Non-streaming error:', error);
          return false;
        }
      };

      // Try production endpoint first
      let success = false;

      if (useStreaming && typeof this.services.api.postStreaming === 'function') {
        success = await handleStreaming(productionEndpoint, productionRequestParams);

        // If production endpoint fails, try test endpoint
        if (!success) {
          onChunk("Production endpoint failed, trying test endpoint...\n\n");
          success = await handleStreaming(testEndpoint, testRequestParams);
        }
      } else {
        success = await handleNonStreaming(productionEndpoint, productionRequestParams);

        // If production endpoint fails, try test endpoint
        if (!success) {
          onChunk("Production endpoint failed, trying test endpoint...\n\n");
          success = await handleNonStreaming(testEndpoint, testRequestParams);
        }
      }

      // If both endpoints failed, show error message
      if (!success) {
        onChunk("Sorry, I couldn't generate a response. Both production and test endpoints failed.");
      }

      return success;
    } catch (error) {
      console.error('Error in sendPrompt:', error);
      onChunk("Sorry, I couldn't generate a response. Please try again.");
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