import React from 'react';
import { ChatMessage } from '../types';
import { formatTimestamp } from '../utils';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  error: string;
  chatHistoryRef: React.RefObject<HTMLDivElement>;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isLoading,
  isLoadingHistory,
  error,
  chatHistoryRef
}) => {
  /**
   * Render a chat message
   */
  const renderMessage = (message: ChatMessage) => {
    const { sender, content, timestamp, isStreaming } = message;
    const messageClass = `message message-${sender} ${isStreaming ? 'message-streaming' : ''}`;
    
    return (
      <div key={message.id} className={messageClass}>
        <div className="message-content">
          {content}
          {/* Only show typing indicator when content is empty and message is still streaming */}
          {isStreaming && content.length === 0 && (
            <span className="typing-indicator">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </span>
          )}
        </div>
        <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
      </div>
    );
  };

  /**
   * Render loading indicator
   */
  const renderLoadingIndicator = () => {
    return (
      <div className="loading-indicator">
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    );
  };

  /**
   * Render error message
   */
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="error-message">
        {error}
      </div>
    );
  };

  /**
   * Render empty state when no messages
   */
  const renderEmptyState = () => {
    if (messages.length > 0) return null;
    
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          💬
        </div>
        <div className="empty-state-text">
          Start a conversation by typing a message below.
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={chatHistoryRef}
      className="chat-history"
    >
      {/* Show error if any */}
      {renderError()}
      
      {/* Show loading indicator for history */}
      {isLoadingHistory && renderLoadingIndicator()}
      
      {/* Show empty state or messages */}
      {!isLoadingHistory && messages.length === 0 ? (
        renderEmptyState()
      ) : (
        messages.map(message => renderMessage(message))
      )}
    </div>
  );
};

export default ChatHistory;