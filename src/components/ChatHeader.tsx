import React from 'react';
import { ModelInfo, ConversationInfo, PersonaInfo } from '../types';
import { formatRelativeTime } from '../utils';
import { ComposeIcon } from '../icons';

interface ChatHeaderProps {
  // Model selection props
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  isLoadingModels: boolean;
  onModelChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  showModelSelection: boolean;
  
  // Persona selection props
  personas: PersonaInfo[];
  selectedPersona: PersonaInfo | null;
  onPersonaChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  showPersonaSelection: boolean;
  
  // Conversation history props
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  onConversationSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onNewChatClick: () => void;
  showConversationHistory: boolean;
  
  // Loading states
  isLoading: boolean;
  isLoadingHistory: boolean;
}

interface ChatHeaderState {
  // No state needed for simplified header
}

class ChatHeader extends React.Component<ChatHeaderProps, ChatHeaderState> {
  constructor(props: ChatHeaderProps) {
    super(props);
    this.state = {};
  }

  render() {
    const {
      models,
      selectedModel,
      isLoadingModels,
      onModelChange,
      showModelSelection,
      personas,
      selectedPersona,
      onPersonaChange,
      showPersonaSelection,
      conversations,
      selectedConversation,
      onConversationSelect,
      onNewChatClick,
      showConversationHistory,
      isLoading,
      isLoadingHistory
    } = this.props;

    return (
      <>
        <div className="chat-header-redesigned">
          {/* Left Section - Model Selection */}
          {showModelSelection && (
            <div className="header-model-section">
              <label className="header-label">Model</label>
              {isLoadingModels ? (
                <div className="header-loading">Loading models...</div>
              ) : (
                <select
                  value={selectedModel ? `${selectedModel.provider}_${selectedModel.serverId}_${selectedModel.name}` : ''}
                  onChange={onModelChange}
                  className="header-select"
                  disabled={models.length === 0}
                >
                  {models.length === 0 ? (
                    <option value="">No models available</option>
                  ) : (
                    models.map(model => {
                      const modelId = `${model.provider}_${model.serverId}_${model.name}`;
                      return (
                        <option key={modelId} value={modelId}>
                          {model.name} ({model.serverName})
                        </option>
                      );
                    })
                  )}
                </select>
              )}
            </div>
          )}

          {/* Middle Section - Persona Selection */}
          {showPersonaSelection && (
            <div className="header-persona-section">
              <label className="header-label">Persona</label>
              <select
                value={selectedPersona?.id || ''}
                onChange={onPersonaChange}
                className="header-select"
                disabled={this.props.isLoading || this.props.isLoadingHistory}
              >
                <option value="">No Persona</option>
                {personas.map(persona => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Section - New Chat Button */}
          <div className="header-actions-section">
            <button
              className="header-new-chat-button"
              onClick={onNewChatClick}
              disabled={isLoading}
              title="Start New Chat"
            >
              <ComposeIcon />
            </button>
          </div>
        </div>
      </>
    );
  }
}

export default ChatHeader;
