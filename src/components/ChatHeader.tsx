import React from 'react';
import { ModelInfo, ConversationInfo, PersonaInfo } from '../types';
import { formatRelativeTime } from '../utils';
import { ComposeIcon, ThreeDotsIcon, EditIcon, DeleteIcon } from '../icons';

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
  // Conversation actions
  onRenameSelectedConversation?: (id: string) => void;
  onDeleteSelectedConversation?: (id: string) => void;
  
  // Loading states
  isLoading: boolean;
  isLoadingHistory: boolean;
}

interface ChatHeaderState {
  isMenuOpen: boolean;
}

class ChatHeader extends React.Component<ChatHeaderProps, ChatHeaderState> {
  private menuButtonRef: HTMLButtonElement | null = null;
  private menuRef: HTMLDivElement | null = null;
  constructor(props: ChatHeaderProps) {
    super(props);
    this.state = { isMenuOpen: false };
  }

  componentDidMount(): void {
    document.addEventListener('mousedown', this.handleDocumentClick);
  }

  componentWillUnmount(): void {
    document.removeEventListener('mousedown', this.handleDocumentClick);
  }

  handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (
      this.state.isMenuOpen &&
      target &&
      !this.menuRef?.contains(target) &&
      !this.menuButtonRef?.contains(target as Node)
    ) {
      this.setState({ isMenuOpen: false });
    }
  };

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

          {/* History Section - Conversation dropdown */}
          {showConversationHistory && (
            <div className="header-history-section">
              <label className="header-label">History</label>
              <select
                className="header-select header-select-history"
                value={selectedConversation?.id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    onNewChatClick();
                  } else {
                    onConversationSelect(e);
                  }
                }}
                disabled={isLoading || isLoadingHistory}
              >
                <option value="">Start New Chat</option>
                {conversations.map(conv => (
                  <option key={conv.id} value={conv.id}>
                    {conv.title || 'Untitled'}{conv.updated_at || conv.created_at ? ` • ${formatRelativeTime(conv.updated_at || conv.created_at)}` : ''}
                  </option>
                ))}
              </select>
              <div className="history-actions-wrapper" style={{ position: 'relative' }}>
                <button
                  className="header-icon-only"
                  ref={(el) => (this.menuButtonRef = el)}
                  onClick={() => this.setState({ isMenuOpen: !this.state.isMenuOpen })}
                  title="Conversation actions"
                  disabled={!selectedConversation || isLoading || isLoadingHistory}
                  aria-haspopup="menu"
                  aria-expanded={this.state.isMenuOpen}
                >
                  <ThreeDotsIcon />
                </button>
                {this.state.isMenuOpen && selectedConversation && (
                  <div
                    className="conversation-menu"
                    ref={(el) => (this.menuRef = el)}
                    role="menu"
                    style={{ top: 'calc(100% + 6px)' }}
                  >
                    <div className="conversation-menu-item datetime">
                      {selectedConversation.updated_at
                        ? `Updated ${formatRelativeTime(selectedConversation.updated_at)}`
                        : `Created ${formatRelativeTime(selectedConversation.created_at)}`}
                    </div>
                    <button
                      className="conversation-menu-item"
                      role="menuitem"
                      onClick={() => {
                        this.setState({ isMenuOpen: false });
                        this.props.onRenameSelectedConversation?.(selectedConversation.id);
                      }}
                    >
                      <EditIcon />
                      <span>Rename</span>
                    </button>
                    <button
                      className="conversation-menu-item danger"
                      role="menuitem"
                      onClick={() => {
                        this.setState({ isMenuOpen: false });
                        this.props.onDeleteSelectedConversation?.(selectedConversation.id);
                      }}
                    >
                      <DeleteIcon />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
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
