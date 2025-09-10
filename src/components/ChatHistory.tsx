import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, SearchResult } from '../types';
import { formatTimestamp } from '../utils';
import EnhancedCodeBlock from './EnhancedCodeBlock';
import ThinkingBlock from './ThinkingBlock';
import {
    EditIcon,
    RegenerateIcon,
    ContinueIcon,
    SearchIcon,
    ScrollToBottomIcon,
    MarkdownToggleIcon
  } from '../icons';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  error: string;
  chatHistoryRef: React.RefObject<HTMLDivElement>;
  editingMessageId: string | null;
  editingContent: string;
  onStartEditing: (messageId: string, content: string) => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onEditingContentChange: (content: string) => void;
  onRegenerateResponse: () => void;
  onContinueGeneration: () => void;
  showScrollToBottom?: boolean;
  onScrollToBottom?: () => void;
  onToggleMarkdown?: (messageId: string) => void;
}

interface ChatHistoryState {
  expandedSearchResults: Set<string>;
  expandedDocumentContext: Set<string>;
}

class ChatHistory extends React.Component<ChatHistoryProps, ChatHistoryState> {
  constructor(props: ChatHistoryProps) {
    super(props);
    this.state = {
      expandedSearchResults: new Set(),
      expandedDocumentContext: new Set()
    };
  }

  /**
   * Toggle search results expansion
   */
  toggleSearchResults = (messageId: string) => {
    this.setState(prevState => {
      const newSet = new Set(prevState.expandedSearchResults);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return { expandedSearchResults: newSet };
    });
  };

  /**
   * Toggle document context expansion
   */
  toggleDocumentContext = (messageId: string) => {
    this.setState(prevState => {
      const newSet = new Set(prevState.expandedDocumentContext);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return { expandedDocumentContext: newSet };
    });
  };

  /**
   * Render search result item
   */
  renderSearchResult = (result: SearchResult, index: number) => {
    return (
      <div key={index} className="search-result-item">
        <div className="search-result-header">
          <span className="search-result-number">{index + 1}.</span>
          <a 
            href={result.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="search-result-title"
          >
            {result.title}
          </a>
        </div>
        <div className="search-result-url">{result.url}</div>
        {result.content && (
          <div className="search-result-content">{result.content}</div>
        )}
      </div>
    );
  };

  /**
   * Render document context message
   */
  renderDocumentContext = (message: ChatMessage) => {
    const { documentData } = message;
    if (!documentData) return null;

    const isExpanded = this.state.expandedDocumentContext.has(message.id);
    const { results } = documentData;

    return (
      <div className={`message message-ai message-document-context`}>
        <div className="document-context-header">
          <div className="document-context-summary">
            <span className="document-icon">📄</span>
            <span className="document-filename">
              {results.length === 1 ? results[0].filename : `${results.length} documents`}
            </span>
            <span className="document-info">
              {results.length === 1 
                ? `${results[0].file_type.toUpperCase()} • ${results[0].text_length} chars`
                : `${results.length} files processed`
              }
            </span>
          </div>
          <button
            onClick={() => this.toggleDocumentContext(message.id)}
            className="document-toggle-btn"
            title={isExpanded ? "Hide document content" : "Show document content"}
          >
            <span className="document-toggle-text">
              {isExpanded ? "Hide" : "Show"}
            </span>
            <span className={`document-toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
          </button>
        </div>
        
        {isExpanded && (
          <div className="document-context-content">
            <div className="document-content">
              {documentData.context}
            </div>
          </div>
        )}
      </div>
    );
  };



  /**
   * Render search results message
   */
  renderSearchResultsMessage = (message: ChatMessage) => {
    const { searchData } = message;
    if (!searchData) return null;

    const isExpanded = this.state.expandedSearchResults.has(message.id);
    const hasScrapedContent = searchData.scrapedContent && searchData.successfulScrapes && searchData.successfulScrapes > 0;

    return (
      <div key={message.id} className="message message-ai message-search-results">
        <div className="search-results-header">
          <div className="search-results-summary">
            <span className="search-icon"><SearchIcon /></span>
            <span className="search-query">"{searchData.query}"</span>
            <span className="search-count">({searchData.totalResults} results)</span>
            {hasScrapedContent && (
              <span className="scraping-info">
                + {searchData.successfulScrapes} pages scraped
              </span>
            )}
          </div>
          <button
            className="search-toggle-btn"
            onClick={() => this.toggleSearchResults(message.id)}
            aria-label={isExpanded ? "Collapse search results" : "Expand search results"}
          >
            <span className="search-toggle-icon">
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="search-toggle-text">
              {isExpanded ? 'Hide sources' : 'Show sources'}
            </span>
          </button>
        </div>
        
        {isExpanded && (
          <div className="search-results-content">
            <div className="search-results-list">
              {searchData.results.map((result, index) => this.renderSearchResult(result, index))}
            </div>
            {hasScrapedContent && (
              <div className="scraping-summary">
                <div className="scraping-header">
                  <span className="scraping-icon">📄</span>
                  <span>Detailed content scraped from {searchData.successfulScrapes} web page(s)</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="message-timestamp">{formatTimestamp(message.timestamp)}</div>
      </div>
    );
  };

  /**
   * Render a chat message
   */
  renderMessage = (message: ChatMessage) => {
    // Handle search results messages separately
    if (message.isSearchResults) {
      return this.renderSearchResultsMessage(message);
    }

    // Handle document context messages separately
    if (message.isDocumentContext) {
      return this.renderDocumentContext(message);
    }

    // Handle thinking tags in content
    const { sender, content, timestamp, isStreaming, isEditable, isEdited, canRegenerate, canContinue, showRawMarkdown } = message;
    
    // Check if content contains thinking tags
    const thinkingMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    let displayContent = content;
    let thinkingContent = null;
    
    if (thinkingMatch) {
      thinkingContent = thinkingMatch[1];
      displayContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    }
    const messageClass = `message message-${sender}`;
    const isEditing = this.props.editingMessageId === message.id;
    
    return (
      <div key={message.id} className={messageClass}>
        <div className="message-content">
          {/* Render thinking block if present */}
          {thinkingContent && (
            <ThinkingBlock>
              {thinkingContent}
            </ThinkingBlock>
          )}
          {isEditing ? (
            <div className="message-edit-container">
              <textarea
                value={this.props.editingContent}
                onChange={(e) => this.props.onEditingContentChange(e.target.value)}
                className="message-edit-input"
                rows={Math.max(1, this.props.editingContent.split('\n').length)}
                autoFocus
              />
              <div className="message-edit-actions">
                <button
                  onClick={this.props.onSaveEditing}
                  className="btn btn-primary btn-sm"
                  disabled={!this.props.editingContent.trim()}
                >
                  Save
                </button>
                <button
                  onClick={this.props.onCancelEditing}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {sender === 'user' ? (
                /* Show user content as plain text */
                displayContent
              ) : (
                /* AI responses with markdown rendering */
                showRawMarkdown ? (
                  // Raw markdown view
                  <pre className="raw-markdown-content">
                    <code>{displayContent}</code>
                  </pre>
                ) : (
                  // Formatted markdown view
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Custom link component to open in new tab
                      a: ({ node, ...props }) => (
                        <a 
                          {...props} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="markdown-link"
                        />
                      ),
                      // Enhanced code block component
                      code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const content = String(children).replace(/\n$/, '');
                        
                        // Check if this is a code block (3+ backticks) or inline code
                        if (!inline && (content.includes('\n') || className)) {
                          // Generate a stable key based on content and message ID
                          const codeBlockKey = `${message.id}-${content.slice(0, 50).replace(/\s/g, '')}-${content.length}`;
                          return (
                            <EnhancedCodeBlock 
                              key={codeBlockKey}
                              className={className}
                              language={match?.[1]}
                            >
                              {content}
                            </EnhancedCodeBlock>
                          );
                        } else {
                          // Inline code (single backticks)
                          return (
                            <code className="markdown-inline-code" {...props}>
                              {content}
                            </code>
                          );
                        }
                      },
                      // Custom blockquote component
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="markdown-blockquote" {...props} />
                      ),
                      // Custom table components
                      table: ({ node, ...props }) => (
                        <div className="markdown-table-wrapper">
                          <table className="markdown-table" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="markdown-table-header" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="markdown-table-cell" {...props} />
                      ),
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                )
              )}
              {isEdited && (
                <span className="message-edited-indicator"> (edited)</span>
              )}
              {/* Only show typing indicator when content is empty and message is still streaming */}
              {isStreaming && displayContent.length === 0 && (
                <span className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </span>
              )}
            </>
          )}
        </div>
        
        <div className="message-actions">
          <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
          
          {/* User message actions */}
          {sender === 'user' && isEditable && !isEditing && (
            <button
              onClick={() => this.props.onStartEditing(message.id, content)}
              className="message-action-btn"
              title="Edit message"
            >
              <EditIcon />
            </button>
          )}
          
          {/* AI message actions */}
          {sender === 'ai' && !isStreaming && (
            <div className="ai-message-actions">
              {/* Markdown toggle button */}
              <button
                onClick={() => this.props.onToggleMarkdown?.(message.id)}
                className="message-action-btn"
                title={showRawMarkdown ? "Show formatted view" : "Show raw markdown"}
              >
                <MarkdownToggleIcon />
              </button>
              {canRegenerate && (
                <button
                  onClick={this.props.onRegenerateResponse}
                  className="message-action-btn"
                  title="Regenerate response"
                >
                  <RegenerateIcon />
                </button>
              )}
              {canContinue && (
                <button
                  onClick={this.props.onContinueGeneration}
                  className="message-action-btn"
                  title="Continue generation"
                >
                  <ContinueIcon />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render loading indicator
   */
  renderLoadingIndicator = () => {
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
  renderError = () => {
    if (!this.props.error) return null;
    
    return (
      <div className="error-message">
        {this.props.error}
      </div>
    );
  };

  /**
   * Render empty state when no messages
   */
  renderEmptyState = () => {
    if (this.props.messages.length > 0) return null;
    
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

  /**
   * Render scroll to bottom button
   */
  renderScrollToBottomButton = () => {
    const { showScrollToBottom, onScrollToBottom } = this.props;
    
    if (!showScrollToBottom || !onScrollToBottom) return null;
    
    return (
      <button
        onClick={onScrollToBottom}
        className="scroll-to-bottom-button"
        title="Scroll to bottom"
        aria-label="Scroll to bottom"
      >
        <ScrollToBottomIcon />
      </button>
    );
  };

  render() {
    const { messages, isLoadingHistory, chatHistoryRef } = this.props;

    return (
      <div className="chat-history-container">
        <div 
          ref={chatHistoryRef}
          className="chat-history"
        >
          {/* Show error if any */}
          {this.renderError()}
          
          {/* Show loading indicator for history */}
          {isLoadingHistory && this.renderLoadingIndicator()}
          
          {/* Show empty state or messages */}
          {!isLoadingHistory && messages.length === 0 ? (
            this.renderEmptyState()
          ) : (
            messages.map(message => this.renderMessage(message))
          )}
        </div>
        
        {/* Scroll to bottom button */}
        {this.renderScrollToBottomButton()}
      </div>
    );
  }
}

export default ChatHistory;