import React from 'react';
import { ModelInfo } from '../types';
import {
    SendIcon,
    StopIcon,
    ThreeDotsIcon,
    FileIcon,
    SearchIcon,
    PersonaIcon
  } from '../icons';

interface ChatInputProps {
  inputText: string;
  isLoading: boolean;
  isLoadingHistory: boolean;
  isStreaming: boolean;
  selectedModel: ModelInfo | null;
  promptQuestion?: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onFileUpload: () => void;

  onToggleWebSearch: () => void;
  useWebSearch: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  
  // Persona props
  personas: any[];
  selectedPersona: any;
  onPersonaChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPersonaToggle?: () => void;
  showPersonaSelection: boolean;
}

interface ChatInputState {
  isMenuOpen: boolean;
  showPersonaSelector: boolean;
}

class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
  private menuRef = React.createRef<HTMLDivElement>();

  constructor(props: ChatInputProps) {
    super(props);
    this.state = {
      isMenuOpen: false,
      showPersonaSelector: false
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    
    // Initialize local persona selector state based on main component's persona state
    console.log(`🎭 ChatInput mounted - showPersonaSelection: ${this.props.showPersonaSelection}, selectedPersona: ${this.props.selectedPersona?.name || 'null'}`);
    
    // The persona selector should be disabled by default and only shown when user toggles it
    // Don't automatically enable it even if there's a selected persona
  }

  componentDidUpdate(prevProps: ChatInputProps) {
    // Ensure local persona selector state stays in sync with main component
    if (prevProps.selectedPersona !== this.props.selectedPersona) {
      console.log(`🎭 ChatInput: Persona changed from ${prevProps.selectedPersona?.name || 'null'} to ${this.props.selectedPersona?.name || 'null'}`);
    }
    
    // If showPersonaSelection prop changes, sync local state
    if (prevProps.showPersonaSelection !== this.props.showPersonaSelection) {
      console.log(`🎭 ChatInput: showPersonaSelection changed from ${prevProps.showPersonaSelection} to ${this.props.showPersonaSelection}`);
      
      // If personas are globally disabled, ensure local selector is also off
      if (!this.props.showPersonaSelection && this.state.showPersonaSelector) {
        console.log(`🎭 ChatInput: Syncing local state - turning off persona selector because personas are globally disabled`);
        this.setState({ showPersonaSelector: false });
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (event: MouseEvent) => {
    if (this.menuRef.current && !this.menuRef.current.contains(event.target as Node)) {
      this.setState({ isMenuOpen: false });
    }
  };

  toggleMenu = () => {
    this.setState(prevState => ({ isMenuOpen: !prevState.isMenuOpen }));
  };

  handleFileUpload = () => {
    this.props.onFileUpload();
    this.setState({ isMenuOpen: false });
  };

  handleWebSearchToggle = () => {
    this.props.onToggleWebSearch();
    this.setState({ isMenuOpen: false });
  };

  handlePersonaToggle = () => {
    this.setState(prevState => {
      const newShowPersonaSelector = !prevState.showPersonaSelector;
      
      // If turning off persona selector, reset the persona
      if (!newShowPersonaSelector && this.props.onPersonaToggle) {
        this.props.onPersonaToggle();
      }
      
      console.log(`🎭 ChatInput: Persona toggle - newShowPersonaSelector: ${newShowPersonaSelector}`);
      
      return {
        showPersonaSelector: newShowPersonaSelector,
        isMenuOpen: false
      };
    });
  };

  render() {
    const {
      inputText,
      isLoading,
      isLoadingHistory,
      isStreaming,
      selectedModel,
      promptQuestion,
      onInputChange,
      onKeyPress,
      onSendMessage,
      onStopGeneration,
      useWebSearch,
      inputRef,
      personas,
      selectedPersona,
      onPersonaChange,
      showPersonaSelection
    } = this.props;

    const { isMenuOpen, showPersonaSelector } = this.state;
    
    return (
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <div className="input-with-buttons">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={onInputChange}
              onKeyPress={onKeyPress}
              placeholder={promptQuestion || "Type your message here..."}
              className="chat-input"
              disabled={isLoading || isLoadingHistory}
              rows={3}
            />
            
            {/* Bottom button row inside textarea */}
            <div className="input-buttons-row">
              {/* Left side buttons */}
              <div className="input-buttons-left">
                {/* 3-Dots Menu - Bottom Left */}
                <div className="menu-container" ref={this.menuRef}>
                  <button
                    onClick={this.toggleMenu}
                    disabled={isLoading || isLoadingHistory || isStreaming}
                    className="input-button menu-button"
                    title="More options"
                  >
                    <ThreeDotsIcon />
                  </button>
                  
                  {isMenuOpen && (
                    <div className="dropdown-menu">
                      <button
                        onClick={this.handleFileUpload}
                        className="menu-item"
                        disabled={isLoading || isLoadingHistory || isStreaming}
                      >
                        <FileIcon />
                        <span>Upload Documents</span>
                      </button>
                      <button
                        onClick={this.handleWebSearchToggle}
                        className={`menu-item ${useWebSearch ? 'active' : ''}`}
                        disabled={isLoading || isLoadingHistory}
                      >
                        <SearchIcon isActive={useWebSearch} />
                        <span>Web Search {useWebSearch ? 'On' : 'Off'}</span>
                      </button>
                      {showPersonaSelection && (
                        <button
                          onClick={this.handlePersonaToggle}
                          className={`menu-item ${showPersonaSelector ? 'active' : ''}`}
                          disabled={isLoading || isLoadingHistory}
                        >
                          <PersonaIcon />
                          <span>Persona {showPersonaSelector ? 'On' : 'Off'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Persona Selector - shown when enabled, to the right of more button */}
                {showPersonaSelector && showPersonaSelection && (
                  <select
                    value={selectedPersona?.id || ''}
                    onChange={onPersonaChange}
                    className="persona-selector"
                    disabled={isLoading || isLoadingHistory}
                    title="Select persona"
                  >
                    <option value="">No Persona</option>
                    {personas.map((persona: any) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Send Button - Bottom Right */}
              <button
                onClick={isStreaming ? onStopGeneration : onSendMessage}
                disabled={(!inputText.trim() && !isStreaming) || isLoadingHistory || !selectedModel}
                className={`input-button send-button ${isStreaming ? 'stop-button' : ''}`}
                title={isStreaming ? "Stop generation" : "Send message"}
              >
                {isStreaming ? <StopIcon /> : <SendIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ChatInput;