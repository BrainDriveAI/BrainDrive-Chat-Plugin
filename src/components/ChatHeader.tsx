import React from 'react';
import { ModelInfo, ConversationInfo } from '../types';
import { formatRelativeTime } from '../utils';

interface ChatHeaderProps {
  // Model selection props
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  isLoadingModels: boolean;
  onModelChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  showModelSelection: boolean;
  
  // Conversation history props
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  onConversationSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onNewChatClick: () => void;
  onRenameConversation?: (conversationId: string, newTitle: string) => Promise<void>;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
  showConversationHistory: boolean;
  
  // Streaming toggle props
  useStreaming: boolean;
  onToggleStreaming: () => void;
  isLoading: boolean;
  isLoadingHistory: boolean;
}

interface ChatHeaderState {
  isRenameModalOpen: boolean;
  isDeleteModalOpen: boolean;
  renameTitle: string;
  isUpdating: boolean;
}

// Simple icons as SVG components
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const PencilIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6"></polyline>
    <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
  </svg>
);

const StreamingIcon = ({ isActive }: { isActive: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    {isActive && (
      <>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
        <circle cx="12" cy="12" r="3" fillOpacity="0.3"/>
      </>
    )}
  </svg>
);

// Simple Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

class ChatHeader extends React.Component<ChatHeaderProps, ChatHeaderState> {
  constructor(props: ChatHeaderProps) {
    super(props);
    
    this.state = {
      isRenameModalOpen: false,
      isDeleteModalOpen: false,
      renameTitle: '',
      isUpdating: false
    };
  }

  handleRenameClick = () => {
    if (this.props.selectedConversation) {
      this.setState({
        renameTitle: this.props.selectedConversation.title || '',
        isRenameModalOpen: true
      });
    }
  };

  handleRenameSubmit = async () => {
    const { selectedConversation, onRenameConversation } = this.props;
    const { renameTitle } = this.state;
    
    if (!selectedConversation || !onRenameConversation || !renameTitle.trim()) return;
    
    this.setState({ isUpdating: true });
    try {
      await onRenameConversation(selectedConversation.id, renameTitle.trim());
      this.setState({ isRenameModalOpen: false });
    } catch (error) {
      console.error('Error renaming conversation:', error);
    } finally {
      this.setState({ isUpdating: false });
    }
  };

  handleDeleteClick = () => {
    if (this.props.selectedConversation) {
      this.setState({ isDeleteModalOpen: true });
    }
  };

  handleDeleteConfirm = async () => {
    const { selectedConversation, onDeleteConversation } = this.props;
    
    if (!selectedConversation || !onDeleteConversation) return;
    
    this.setState({ isUpdating: true });
    try {
      await onDeleteConversation(selectedConversation.id);
      this.setState({ isDeleteModalOpen: false });
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      this.setState({ isUpdating: false });
    }
  };

  handleCloseRenameModal = () => {
    this.setState({ isRenameModalOpen: false });
  };

  handleCloseDeleteModal = () => {
    this.setState({ isDeleteModalOpen: false });
  };

  handleRenameTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ renameTitle: e.target.value });
  };

  handleRenameKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      this.handleRenameSubmit();
    }
  };

  render() {
    const {
      models,
      selectedModel,
      isLoadingModels,
      onModelChange,
      showModelSelection,
      conversations,
      selectedConversation,
      onConversationSelect,
      onNewChatClick,
      showConversationHistory,
      useStreaming,
      onToggleStreaming,
      isLoading,
      isLoadingHistory
    } = this.props;

    const { isRenameModalOpen, isDeleteModalOpen, renameTitle, isUpdating } = this.state;

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

          {/* Center Section - History Dropdown */}
          {showConversationHistory && (
            <div className="header-history-section">
              <label className="header-label">History</label>
              <select
                value={selectedConversation?.id || ''}
                onChange={onConversationSelect}
                className="header-select header-select-history"
                disabled={isUpdating}
              >
                <option value="">Select a conversation or start new</option>
                {conversations.map(conv => (
                  <option key={conv.id} value={conv.id}>
                    {conv.title || 'Untitled'} • {formatRelativeTime(conv.created_at)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Section - Action Icons */}
          <div className="header-actions-section">
            <button
              onClick={onNewChatClick}
              className="header-icon-only"
              title="Start New Chat"
              disabled={isLoading || isLoadingHistory}
            >
              <PlusIcon />
            </button>
            
            <button
              onClick={this.handleRenameClick}
              className="header-icon-only"
              title="Rename Conversation"
              disabled={!selectedConversation || isUpdating}
            >
              <PencilIcon />
            </button>
            
            <button
              onClick={this.handleDeleteClick}
              className="header-icon-only header-icon-danger"
              title="Delete Conversation"
              disabled={!selectedConversation || isUpdating}
            >
              <TrashIcon />
            </button>

            <button
              onClick={onToggleStreaming}
              className={`header-icon-only header-icon-streaming ${useStreaming ? 'active' : 'inactive'}`}
              title={`Streaming ${useStreaming ? 'On' : 'Off'}`}
              disabled={isLoading || isLoadingHistory}
            >
              <StreamingIcon isActive={useStreaming} />
            </button>
          </div>
        </div>

        {/* Rename Modal */}
        <Modal
          isOpen={isRenameModalOpen}
          onClose={this.handleCloseRenameModal}
          title="Rename Conversation"
        >
          <div className="modal-form">
            <input
              type="text"
              value={renameTitle}
              onChange={this.handleRenameTitleChange}
              placeholder="Enter conversation title"
              className="modal-input"
              disabled={isUpdating}
              onKeyPress={this.handleRenameKeyPress}
            />
            <div className="modal-actions">
              <button
                onClick={this.handleCloseRenameModal}
                className="modal-btn modal-btn-secondary"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={this.handleRenameSubmit}
                className="modal-btn modal-btn-primary"
                disabled={isUpdating || !renameTitle.trim()}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={this.handleCloseDeleteModal}
          title="Delete Conversation"
        >
          <div className="modal-form">
            <p className="modal-text">
              Are you sure you want to delete "{selectedConversation?.title || 'Untitled'}"?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={this.handleCloseDeleteModal}
                className="modal-btn modal-btn-secondary"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={this.handleDeleteConfirm}
                className="modal-btn modal-btn-danger"
                disabled={isUpdating}
              >
                {isUpdating ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }
}

export default ChatHeader;