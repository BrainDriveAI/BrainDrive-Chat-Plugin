import React from 'react';
import './BrainDriveChat.css';
import {
  BrainDriveChatProps,
  BrainDriveChatState,
  ChatMessage,
  ModelInfo
} from './types';
import {
  generateId,
  debounce
} from './utils';

// Import modular components
import {
  ChatHeader,
  ChatHistory,
  ChatInput,
  LoadingStates
} from './components';

// Note: Using class-based approach for plugin compatibility
// Hooks are available as separate modules for future functional components

// Import services
import { AIService } from './services';

/**
 * Unified BrainDriveChat component that combines AI chat, model selection, and conversation history
 */
class BrainDriveChat extends React.Component<BrainDriveChatProps, BrainDriveChatState> {
  private chatHistoryRef = React.createRef<HTMLDivElement>();
  private inputRef = React.createRef<HTMLTextAreaElement>();
  private themeChangeListener: ((theme: string) => void) | null = null;
  private pageContextUnsubscribe: (() => void) | null = null;
  private currentPageContext: any = null;
  private readonly STREAMING_SETTING_KEY = 'ai_prompt_chat_streaming_enabled';
  private initialGreetingAdded = false;
  private debouncedScrollToBottom: () => void;
  private aiService: AIService | null = null;

  constructor(props: BrainDriveChatProps) {
    super(props);
    
    this.state = {
      // Chat state
      messages: [],
      inputText: '',
      isLoading: false,
      error: '',
      currentTheme: 'light',
      selectedModel: null,
      useStreaming: props.defaultStreamingMode !== undefined
        ? !!props.defaultStreamingMode
        : true,
      conversation_id: null,
      isLoadingHistory: false,
      currentUserId: null,
      isInitializing: true,
      
      // History state
      conversations: [],
      selectedConversation: null,
      isUpdating: false,
      
      // Model selection state
      models: [],
      isLoadingModels: true,
      
      // UI state
      showModelSelection: true,
      showConversationHistory: true
    };
    
    // Bind methods
    this.debouncedScrollToBottom = debounce(this.scrollToBottom.bind(this), 100);
    
    // Initialize AI service
    this.aiService = new AIService(props.services);
  }

  componentDidMount() {
    this.initializeThemeService();
    this.initializePageContextService();
    this.loadInitialData();
    this.loadSavedStreamingMode();
    
    // Set initialization timeout
    setTimeout(() => {
      if (!this.state.conversation_id) {
        // Add initial greeting if provided and not already added
        if (this.props.initialGreeting && !this.initialGreetingAdded) {
          this.initialGreetingAdded = true;
          
          const greetingMessage: ChatMessage = {
            id: generateId('greeting'),
            sender: 'ai',
            content: this.props.initialGreeting,
            timestamp: new Date().toISOString()
          };
          
          this.setState(prevState => ({
            messages: [...prevState.messages, greetingMessage],
            isInitializing: false
          }));
        } else {
          this.setState({ isInitializing: false });
        }
      }
    }, 2000);
  }

  componentDidUpdate(prevProps: BrainDriveChatProps, prevState: BrainDriveChatState) {
    // Scroll to bottom when new messages are added
    if (prevState.messages.length !== this.state.messages.length) {
      this.debouncedScrollToBottom();
    }
  }

  componentWillUnmount() {
    // Clean up theme listener
    if (this.themeChangeListener && this.props.services?.theme) {
      this.props.services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
    
    // Clean up page context subscription
    if (this.pageContextUnsubscribe) {
      this.pageContextUnsubscribe();
    }
  }

  /**
   * Load initial data (models and conversations)
   */
  loadInitialData = async () => {
    await Promise.all([
      this.loadProviderSettings(),
      this.fetchConversations()
    ]);
  }

  /**
   * Get page-specific setting key with fallback to global
   */
  private getSettingKey(baseSetting: string): string {
    const pageContext = this.getCurrentPageContext();
    if (pageContext?.pageId) {
      return `page_${pageContext.pageId}_${baseSetting}`;
    }
    return baseSetting; // Fallback to global
  }

  /**
   * Get saved streaming mode from settings (page-specific with global fallback)
   */
  getSavedStreamingMode = async (): Promise<boolean | null> => {
    try {
      if (this.props.services?.settings?.getSetting) {
        // Try page-specific setting first
        const pageSpecificKey = this.getSettingKey(this.STREAMING_SETTING_KEY);
        let savedValue = await this.props.services.settings.getSetting(pageSpecificKey);
        
        // Fallback to global setting if page-specific doesn't exist
        if (savedValue === null || savedValue === undefined) {
          savedValue = await this.props.services.settings.getSetting(this.STREAMING_SETTING_KEY);
        }
        
        if (typeof savedValue === 'boolean') {
          return savedValue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Load saved streaming mode from settings
   */
  loadSavedStreamingMode = async (): Promise<void> => {
    try {
      const savedStreamingMode = await this.getSavedStreamingMode();
      if (savedStreamingMode !== null) {
        this.setState({ useStreaming: savedStreamingMode });
      }
    } catch (error) {
      // Error loading streaming mode, use default
    }
  }

  /**
   * Save streaming mode to settings (page-specific)
   */
  saveStreamingMode = async (enabled: boolean): Promise<void> => {
    try {
      if (this.props.services?.settings?.setSetting) {
        // Save to page-specific setting key
        const pageSpecificKey = this.getSettingKey(this.STREAMING_SETTING_KEY);
        await this.props.services.settings.setSetting(pageSpecificKey, enabled);
      }
    } catch (error) {
      // Error saving streaming mode
    }
  }

  /**
   * Toggle streaming mode
   */
  toggleStreamingMode = async () => {
    const newStreamingMode = !this.state.useStreaming;
    this.setState({ useStreaming: newStreamingMode });
    await this.saveStreamingMode(newStreamingMode);
    
    // Add a message to the chat history indicating the mode change
    this.addMessageToChat({
      id: generateId('streaming-mode'),
      sender: 'ai',
      content: `Streaming mode ${newStreamingMode ? 'enabled' : 'disabled'}`,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Initialize the theme service to listen for theme changes
   */
  initializeThemeService = () => {
    if (this.props.services?.theme) {
      try {
        // Get the current theme
        const currentTheme = this.props.services.theme.getCurrentTheme();
        this.setState({ currentTheme });
        
        // Set up theme change listener
        this.themeChangeListener = (newTheme: string) => {
          this.setState({ currentTheme: newTheme });
        };
        
        // Add the listener to the theme service
        this.props.services.theme.addThemeChangeListener(this.themeChangeListener);
      } catch (error) {
        // Error initializing theme service
      }
    }
  }

  /**
   * Initialize the page context service to listen for page changes
   */
  initializePageContextService = () => {
    if (this.props.services?.pageContext) {
      try {
        // Get initial page context
        this.currentPageContext = this.props.services.pageContext.getCurrentPageContext();
        
        // Subscribe to page context changes
        this.pageContextUnsubscribe = this.props.services.pageContext.onPageContextChange(
          (context) => {
            this.currentPageContext = context;
            // Reload conversations when page changes to show page-specific conversations
            this.fetchConversations();
          }
        );
      } catch (error) {
        // Error initializing page context service
        console.warn('Failed to initialize page context service:', error);
      }
    }
  }

  /**
   * Helper method to get current page context
   */
  private getCurrentPageContext() {
    if (this.props.services?.pageContext) {
      return this.props.services.pageContext.getCurrentPageContext();
    }
    return this.currentPageContext;
  }

  /**
   * Load provider settings and models
   */
  loadProviderSettings = async () => {
    this.setState({ isLoadingModels: true, error: '' });
    
    if (!this.props.services?.api) {
      this.setState({ 
        isLoadingModels: false, 
        error: 'API service not available' 
      });
      return;
    }
    
    try {
      // Get provider settings from configuration or use default
      const providerSettingIds = ['ollama_servers_settings'];
      const models: ModelInfo[] = [];
      
      // Load each provider setting
      for (const settingId of providerSettingIds) {
        try {
          const response = await this.props.services.api.get('/api/v1/settings/instances', {
            params: {
              definition_id: settingId,
              scope: 'user',
              user_id: 'current'
            }
          });
          
          // Process response to extract settings data
          let settingsData = null;
          
          if (Array.isArray(response) && response.length > 0) {
            settingsData = response[0];
          } else if (response && typeof response === 'object') {
            const responseObj = response as Record<string, any>;
            
            if (responseObj.data) {
              if (Array.isArray(responseObj.data) && responseObj.data.length > 0) {
                settingsData = responseObj.data[0];
              } else if (typeof responseObj.data === 'object') {
                settingsData = responseObj.data;
              }
            } else {
              settingsData = response;
            }
          }
          
          if (settingsData && settingsData.value) {
            // Parse the value field
            let parsedValue = typeof settingsData.value === 'string' 
              ? JSON.parse(settingsData.value) 
              : settingsData.value;
            
            const providerSetting = {
              id: settingId,
              name: settingsData.name || settingId,
              servers: Array.isArray(parsedValue.servers) ? parsedValue.servers : []
            };
            
            // Load models for each server
            for (const server of providerSetting.servers) {
              try {
                const encodedUrl = encodeURIComponent(server.serverAddress);
                const params: Record<string, string> = { 
                  server_url: encodedUrl,
                  settings_id: providerSetting.id,
                  server_id: server.id
                };
                
                if (server.apiKey) {
                  params.api_key = server.apiKey;
                }
                
                const modelResponse = await this.props.services.api.get('/api/v1/ollama/models', { params });
                const serverModels = Array.isArray(modelResponse) ? modelResponse : [];
                
                // Map server models to ModelInfo format
                for (const model of serverModels) {
                  models.push({
                    name: model.name,
                    provider: 'ollama',
                    providerId: providerSetting.id,
                    serverName: server.serverName,
                    serverId: server.id
                  });
                }
              } catch (error) {
                console.error(`Error loading models for server ${server.serverName}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading provider setting ${settingId}:`, error);
        }
      }
      
      // Update state with models
      this.setState({
        models,
        isLoadingModels: false,
        selectedModel: models.length > 0 ? models[0] : null
      });
      
      // Broadcast initial model selection if available
      if (models.length > 0) {
        this.broadcastModelSelection(models[0]);
      }
    } catch (error: any) {
      console.error("Error loading provider settings:", error);
      
      this.setState({
        isLoadingModels: false,
        error: `Error loading models: ${error.message || 'Unknown error'}`
      });
    }
  };

  /**
   * Fetch conversations from the API
   */
  fetchConversations = async () => {
    if (!this.props.services?.api) {
      this.setState({
        isLoadingHistory: false,
        error: 'API service not available'
      });
      return;
    }
    
    try {
      this.setState({ isLoadingHistory: true, error: '' });
      
      // First, get the current user's information to get their ID
      const userResponse = await this.props.services.api.get('/api/v1/auth/me');
      
      // Extract the user ID from the response
      let userId = userResponse.id;
      
      if (!userId) {
        throw new Error('Could not get current user ID');
      }
      
      // Get current page context for page-specific conversations
      const pageContext = this.getCurrentPageContext();
      const params: any = {
        skip: 0,
        limit: 50, // Fetch up to 50 conversations
        conversation_type: this.props.conversationType || "chat" // Filter by conversation type
      };
      
      // Add page_id if available for page-specific conversations
      if (pageContext?.pageId) {
        params.page_id = pageContext.pageId;
      }
      
      // Use the user ID as is - backend now handles IDs with or without dashes
      const response = await this.props.services.api.get(
        `/api/v1/users/${userId}/conversations`,
        { params }
      );
      
      let conversations = [];
      
      if (Array.isArray(response)) {
        conversations = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        conversations = response.data;
      } else if (response) {
        // Try to extract conversations from the response in a different way
        try {
          if (typeof response === 'object') {
            // Check if the response itself might be the conversations array
            if (response.id && response.user_id) {
              conversations = [response];
            }
          }
        } catch (parseError) {
          // Error parsing response
        }
      }
      
      if (conversations.length === 0) {
        // No conversations yet, but this is not an error
        this.setState({
          conversations: [],
          isLoadingHistory: false
        });
        
        return;
      }
      
      // Validate conversation objects
      const validConversations = conversations.filter((conv: any) => {
        return conv && typeof conv === 'object' && conv.id && conv.user_id;
      });
      
      // Sort conversations by most recently updated or created
      validConversations.sort((a: any, b: any) => {
        // Use updated_at if available for both conversations
        if (a.updated_at && b.updated_at) {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        
        // If only one has updated_at, prioritize that one
        if (a.updated_at && !b.updated_at) {
          return -1; // a comes first
        }
        
        if (!a.updated_at && b.updated_at) {
          return 1; // b comes first
        }
        
        // If neither has updated_at, fall back to created_at
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Auto-select the most recent conversation if available
      const mostRecentConversation = validConversations.length > 0 ? validConversations[0] : null;
      
      this.setState({
        conversations: validConversations,
        selectedConversation: mostRecentConversation,
        isLoadingHistory: false
      }, () => {
        // Load the most recent conversation if available
        if (mostRecentConversation) {
          this.loadConversationHistory(mostRecentConversation.id);
        }
      });
    } catch (error: any) {
      // Check if it's a 403 Forbidden error
      if (error.status === 403 || (error.response && error.response.status === 403)) {
        // Show empty state for better user experience
        this.setState({
          isLoadingHistory: false,
          conversations: [],
          error: '' // Don't show an error message to the user
        });
      } else if (error.status === 404 || (error.response && error.response.status === 404)) {
        // Handle 404 errors (no conversations found)
        this.setState({
          isLoadingHistory: false,
          conversations: [],
          error: '' // Don't show an error message to the user
        });
      } else {
        // Handle other errors
        this.setState({
          isLoadingHistory: false,
          error: `Error loading conversations: ${error.message || 'Unknown error'}`
        });
      }
    }
  }

  /**
   * Handle model selection change
   */
  handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    const selectedModel = this.state.models.find(model => 
      `${model.provider}_${model.serverId}_${model.name}` === modelId
    );
    
    if (selectedModel) {
      this.setState({ selectedModel }, () => {
        this.broadcastModelSelection(selectedModel);
      });
    }
  };

  /**
   * Broadcast model selection event
   */
  broadcastModelSelection = (model: ModelInfo) => {
    if (!this.props.services?.event) {
      return;
    }
    
    // Create model selection message
    const modelInfo = {
      type: 'model.selection',
      content: {
        model: {
          name: model.name,
          provider: model.provider,
          providerId: model.providerId,
          serverName: model.serverName,
          serverId: model.serverId
        },
        timestamp: new Date().toISOString()
      }
    };
    
    // Send to event system
    this.props.services.event.sendMessage('ai-prompt-chat', modelInfo.content);
  };

  /**
   * Handle conversation selection
   */
  handleConversationSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const conversationId = event.target.value;
    
    if (!conversationId) {
      // New chat selected
      this.handleNewChatClick();
      return;
    }
    
    const selectedConversation = this.state.conversations.find(
      conv => conv.id === conversationId
    );
    
    if (selectedConversation) {
      this.setState({ selectedConversation }, () => {
        this.loadConversationHistory(conversationId);
      });
    }
  };

  /**
   * Handle new chat button click
   */
  handleNewChatClick = () => {
    this.setState({ 
      selectedConversation: null,
      conversation_id: null,
      messages: []
    }, () => {
      // Add initial greeting if provided
      if (this.props.initialGreeting) {
        this.initialGreetingAdded = true;
        this.addMessageToChat({
          id: generateId('greeting'),
          sender: 'ai',
          content: this.props.initialGreeting,
          timestamp: new Date().toISOString()
        });
      }
    });
  };

  /**
   * Handle renaming a conversation
   */
  handleRenameConversation = async (conversationId: string, newTitle: string) => {
    if (!this.props.services?.api) {
      throw new Error('API service not available');
    }

    try {
      await this.props.services.api.put(
        `/api/v1/conversations/${conversationId}`,
        { title: newTitle }
      );

      // Update the conversation in state
      this.setState(prevState => {
        const updatedConversations = prevState.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: newTitle }
            : conv
        );

        const updatedSelectedConversation = prevState.selectedConversation?.id === conversationId
          ? { ...prevState.selectedConversation, title: newTitle }
          : prevState.selectedConversation;

        return {
          conversations: updatedConversations,
          selectedConversation: updatedSelectedConversation
        };
      });

    } catch (error: any) {
      throw new Error(`Error renaming conversation: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Handle deleting a conversation
   */
  handleDeleteConversation = async (conversationId: string) => {
    if (!this.props.services?.api) {
      throw new Error('API service not available');
    }

    try {
      await this.props.services.api.delete(`/api/v1/conversations/${conversationId}`);

      // Update state to remove the conversation
      this.setState(prevState => {
        const updatedConversations = prevState.conversations.filter(
          conv => conv.id !== conversationId
        );

        // If the deleted conversation was selected, clear selection and start new chat
        const wasSelected = prevState.selectedConversation?.id === conversationId;

        return {
          conversations: updatedConversations,
          selectedConversation: wasSelected ? null : prevState.selectedConversation,
          conversation_id: wasSelected ? null : prevState.conversation_id,
          messages: wasSelected ? [] : prevState.messages
        };
      }, () => {
        // If we deleted the selected conversation, add initial greeting if available
        if (this.state.selectedConversation === null && this.props.initialGreeting) {
          this.initialGreetingAdded = true;
          this.addMessageToChat({
            id: generateId('greeting'),
            sender: 'ai',
            content: this.props.initialGreeting,
            timestamp: new Date().toISOString()
          });
        }
      });

    } catch (error: any) {
      throw new Error(`Error deleting conversation: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Load conversation history from the API
   */
  loadConversationHistory = async (conversationId: string) => {
    if (!this.props.services?.api) {
      this.setState({ error: 'API service not available', isInitializing: false });
      return;
    }
    
    try {
      // Clear current conversation without showing initial greeting
      this.setState({
        messages: [],
        conversation_id: null,
        isLoadingHistory: true,
        error: ''
      });
      
      // Fetch conversation with messages
      const response = await this.props.services.api.get(
        `/api/v1/conversations/${conversationId}/with-messages`
      );
      
      // Mark that we've loaded a conversation, so don't show initial greeting
      this.initialGreetingAdded = true;
      
      // Process messages
      const messages: ChatMessage[] = [];
      
      if (response && response.messages && Array.isArray(response.messages)) {
        // Convert API message format to ChatMessage format
        messages.push(...response.messages.map((msg: any) => ({
          id: msg.id || generateId('history'),
          sender: msg.sender === 'llm' ? 'ai' : 'user' as 'ai' | 'user',
          content: msg.message,
          timestamp: msg.created_at
        })));
      }
      
      // Update state
      this.setState({
        messages,
        conversation_id: conversationId,
        isLoadingHistory: false,
        isInitializing: false
      });
      
      // Scroll to bottom after loading history
      setTimeout(() => this.scrollToBottom(), 100);
      
    } catch (error) {
      // Error loading conversation history
      this.setState({
        isLoadingHistory: false,
        error: 'Error loading conversation history',
        isInitializing: false
      });
    }
  }

  /**
   * Add a new message to the chat history
   */
  addMessageToChat = (message: ChatMessage) => {
    this.setState(prevState => ({
      messages: [...prevState.messages, message]
    }));
  }

  /**
   * Scroll the chat history to the bottom
   */
  scrollToBottom = () => {
    if (this.chatHistoryRef.current) {
      this.chatHistoryRef.current.scrollTop = this.chatHistoryRef.current.scrollHeight;
    }
  }

  /**
   * Focus the input field
   */
  focusInput = () => {
    if (this.inputRef.current) {
      // Small delay to ensure the UI has updated
      setTimeout(() => {
        if (this.inputRef.current) {
          this.inputRef.current.focus();
        }
      }, 100);
    }
  };

  /**
   * Handle input change
   */
  handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ inputText: e.target.value });
    
    // Auto-resize the textarea
    if (this.inputRef.current) {
      this.inputRef.current.style.height = 'auto';
      this.inputRef.current.style.height = `${Math.min(this.inputRef.current.scrollHeight, 150)}px`;
    }
  };

  /**
   * Handle key press in the input field
   */
  handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  };

  /**
   * Handle sending a message
   */
  handleSendMessage = () => {
    const { inputText } = this.state;
    
    // Don't send empty messages
    if (!inputText.trim() || this.state.isLoading) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: generateId('user'),
      sender: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };
    
    this.addMessageToChat(userMessage);
    
    // Clear input
    this.setState({ inputText: '' });
    
    // Reset textarea height
    if (this.inputRef.current) {
      this.inputRef.current.style.height = 'auto';
    }
    
    // Send to AI and get response
    this.sendPromptToAI(userMessage.content);
  };

  /**
   * Send prompt to AI provider and handle response
   */
  sendPromptToAI = async (prompt: string) => {
    if (!this.aiService || !this.props.services?.api) {
      this.setState({ error: 'API service not available' });
      return;
    }

    if (!this.state.selectedModel) {
      this.setState({ error: 'Please select a model first' });
      return;
    }
    
    try {
      // Set loading state
      this.setState({ isLoading: true, error: '' });
      
      // Create placeholder for AI response
      const placeholderId = generateId('ai');
      
      this.addMessageToChat({
        id: placeholderId,
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });
      
      // Handle streaming chunks
      const onChunk = (chunk: string) => {
        this.setState(prevState => {
          const updatedMessages = prevState.messages.map(message => {
            if (message.id === placeholderId) {
              return {
                ...message,
                content: message.content + chunk
              };
            }
            return message;
          });
          
          return { ...prevState, messages: updatedMessages };
        }, () => {
          this.scrollToBottom();
        });
      };
      
      // Handle conversation ID updates
      const onConversationId = (id: string) => {
        this.setState({ conversation_id: id }, () => {
          // Refresh conversations list
          this.fetchConversations();
        });
      };
      
      // Get current page context to pass to AI service
      const pageContext = this.getCurrentPageContext();
      
      // Send prompt to AI
      await this.aiService.sendPrompt(
        prompt,
        this.state.selectedModel,
        this.state.useStreaming,
        this.state.conversation_id,
        this.props.conversationType || "chat",
        onChunk,
        onConversationId,
        pageContext
      );
      
      // Finalize the message
      this.setState(prevState => ({
        messages: prevState.messages.map(message => {
          if (message.id === placeholderId) {
            return {
              ...message,
              isStreaming: false
            };
          }
          return message;
        }),
        isLoading: false
      }), () => {
        this.scrollToBottom();
        // Focus the input box after response is completed
        this.focusInput();
      });
      
    } catch (error) {
      // Error in sendPromptToAI
      this.setState({
        isLoading: false,
        error: `Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, () => {
        // Focus input even on error so user can try again
        this.focusInput();
      });
    }
  };

  render() {
    const { 
      inputText, 
      messages, 
      isLoading, 
      isLoadingHistory, 
      useStreaming, 
      error, 
      isInitializing,
      models,
      isLoadingModels,
      selectedModel,
      conversations,
      selectedConversation,
      showModelSelection,
      showConversationHistory
    } = this.state;
    
    const { promptQuestion } = this.props;
    const themeClass = this.state.currentTheme === 'dark' ? 'dark-theme' : '';
    
    return (
      <div className={`braindrive-chat-container ${themeClass}`}>
        <div className="chat-paper">
          {/* Chat header with controls */}
          <ChatHeader
            models={models}
            selectedModel={selectedModel}
            isLoadingModels={isLoadingModels}
            onModelChange={this.handleModelChange}
            showModelSelection={showModelSelection}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onConversationSelect={this.handleConversationSelect}
            onNewChatClick={this.handleNewChatClick}
            onRenameConversation={this.handleRenameConversation}
            onDeleteConversation={this.handleDeleteConversation}
            showConversationHistory={showConversationHistory}
            useStreaming={useStreaming}
            onToggleStreaming={this.toggleStreamingMode}
            isLoading={isLoading}
            isLoadingHistory={isLoadingHistory}
          />
          
          {/* Show initializing state or chat content */}
          {isInitializing ? (
            <LoadingStates isInitializing={isInitializing} />
          ) : (
            <>
              {/* Chat history area */}
              <ChatHistory
                messages={messages}
                isLoading={isLoading}
                isLoadingHistory={isLoadingHistory}
                error={error}
                chatHistoryRef={this.chatHistoryRef}
              />
              
              {/* Chat input area */}
              <ChatInput
                inputText={inputText}
                isLoading={isLoading}
                isLoadingHistory={isLoadingHistory}
                selectedModel={selectedModel}
                promptQuestion={promptQuestion}
                onInputChange={this.handleInputChange}
                onKeyPress={this.handleKeyPress}
                onSendMessage={this.handleSendMessage}
                inputRef={this.inputRef}
              />
            </>
          )}
        </div>
      </div>
    );
  }
}

// Add version information for debugging and tracking
(BrainDriveChat as any).version = '1.0.10';

export default BrainDriveChat;