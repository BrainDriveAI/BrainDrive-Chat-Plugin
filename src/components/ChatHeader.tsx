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
  showConversationHistory: boolean;
  
  // Streaming toggle props
  useStreaming: boolean;
  onToggleStreaming: () => void;
  isLoading: boolean;
  isLoadingHistory: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
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
}) => {
  return (
    <div className="chat-header">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">AI Chat</h3>
        
        {/* Model Selection */}
        {showModelSelection && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Model:</label>
            {isLoadingModels ? (
              <div className="text-sm opacity-70">Loading...</div>
            ) : (
              <select
                value={selectedModel ? `${selectedModel.provider}_${selectedModel.serverId}_${selectedModel.name}` : ''}
                onChange={onModelChange}
                className="dropdown-select text-sm"
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
      </div>
      
      <div className="chat-controls">
        {/* Conversation History */}
        {showConversationHistory && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">History:</label>
            <select
              value={selectedConversation?.id || ''}
              onChange={onConversationSelect}
              className="dropdown-select text-sm"
            >
              <option value="">New Chat</option>
              {conversations.map(conv => (
                <option key={conv.id} value={conv.id}>
                  {conv.title || 'Untitled'} ({formatRelativeTime(conv.created_at)})
                </option>
              ))}
            </select>
            <button
              onClick={onNewChatClick}
              className="btn btn-sm btn-secondary"
              title="Start new chat"
            >
              +
            </button>
          </div>
        )}
        
        {/* Streaming Toggle */}
        <div className="toggle-switch">
          <input
            type="checkbox"
            checked={useStreaming}
            onChange={onToggleStreaming}
            disabled={isLoading || isLoadingHistory}
          />
          <span className="toggle-label">Streaming</span>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;