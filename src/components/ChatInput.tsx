import React from 'react';
import { ModelInfo } from '../types';

interface ChatInputProps {
  inputText: string;
  isLoading: boolean;
  isLoadingHistory: boolean;
  selectedModel: ModelInfo | null;
  promptQuestion?: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  isLoading,
  isLoadingHistory,
  selectedModel,
  promptQuestion,
  onInputChange,
  onKeyPress,
  onSendMessage,
  inputRef
}) => {
  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          placeholder={promptQuestion || "Type your message here..."}
          className="chat-input"
          disabled={isLoading || isLoadingHistory}
          rows={1}
        />
        <button
          onClick={onSendMessage}
          disabled={!inputText.trim() || isLoading || isLoadingHistory || !selectedModel}
          className="send-button"
          title="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatInput;