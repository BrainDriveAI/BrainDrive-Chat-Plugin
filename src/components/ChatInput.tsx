import React from 'react';
import { ModelInfo } from '../types';
import { SendIcon, StopIcon } from '../icons';

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
  isMultiline: boolean;
}

class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
  private menuRef = React.createRef<HTMLDivElement>();

  constructor(props: ChatInputProps) {
    super(props);
    this.state = {
      isMenuOpen: false,
      showPersonaSelector: false,
      isMultiline: false
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    
    // Initialize local persona selector state based on main component's persona state
    console.log(`🎭 ChatInput mounted - showPersonaSelection: ${this.props.showPersonaSelection}, selectedPersona: ${this.props.selectedPersona?.name || 'null'}`);
    
    // The persona selector should be disabled by default and only shown when user toggles it
    // Don't automatically enable it even if there's a selected persona

    // Initialize multiline state
    this.updateMultilineState();
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

    // Update multiline state when text changes
    if (prevProps.inputText !== this.props.inputText) {
      this.updateMultilineState();
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

  // Determine if the textarea has grown beyond one line to adjust button alignment
  updateMultilineState = () => {
    const ta = this.props.inputRef?.current;
    if (!ta) return;
    const computed = window.getComputedStyle(ta);
    const lineHeight = parseFloat(computed.lineHeight || '0') || 24;
    const isMulti = ta.scrollHeight > lineHeight * 1.6; // a bit above 1 line to avoid flicker
    if (isMulti !== this.state.isMultiline) {
      this.setState({ isMultiline: isMulti });
    }
  };

  handleInputChangeProxy = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Call upstream handler first
    this.props.onInputChange(e);
    // Then recompute alignment in the next frame
    requestAnimationFrame(this.updateMultilineState);
  };

  toggleMenu = () => {
    this.setState(prevState => ({ isMenuOpen: !prevState.isMenuOpen }));
  };

  handleFileUpload = () => {
    if (this.props.onFileUpload) {
      this.props.onFileUpload();
    }
    this.setState({ isMenuOpen: false });
  };

  handleWebSearchToggle = () => {
    if (this.props.onToggleWebSearch) {
      this.props.onToggleWebSearch();
    }
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

    // Local dropdown state retained for future menu use; not used in current layout
    
    return (
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <div className="input-with-buttons">
            <div className={`chat-input-row ${this.state.isMultiline ? 'multiline' : ''}`}>
              {/* Persona Selector - optional left control */}
              {showPersonaSelection && (
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

              <textarea
                ref={inputRef}
                value={inputText}
                onChange={this.handleInputChangeProxy}
                onKeyDown={(e) => {
                  onKeyPress(e);
                  // Also recompute alignment after key handling (e.g., Enter)
                  requestAnimationFrame(this.updateMultilineState);
                }}
                placeholder={promptQuestion || "Type your message here..."}
                className="chat-input"
                disabled={isLoading || isLoadingHistory}
                rows={1}
              />

              {/* Send/Stop Button - right aligned */}
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
