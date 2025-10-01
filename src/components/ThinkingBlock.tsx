import React from 'react';

interface ThinkingBlockProps {
  children: string;
  isStreaming?: boolean;
}

interface ThinkingBlockState {
  isExpanded: boolean;
}

class ThinkingBlock extends React.Component<ThinkingBlockProps, ThinkingBlockState> {
  constructor(props: ThinkingBlockProps) {
    super(props);
    this.state = {
      isExpanded: false
    };
  }

  componentDidUpdate(prevProps: ThinkingBlockProps) {
    // Collapse when a new streaming sequence begins
    if (!prevProps.isStreaming && this.props.isStreaming) {
      this.setState({ isExpanded: false });
    }
  }

  toggleExpanded = () => {
    this.setState(prevState => ({
      isExpanded: !prevState.isExpanded
    }));
  };

  render() {
    const { children, isStreaming } = this.props;
    const { isExpanded } = this.state;
    
    // Remove the <think> and </think> tags from the content
    const content = children.replace(/<\/?think>/g, '').trim();

    return (
      <div className={`thinking-block ${isExpanded ? 'expanded' : 'collapsed'} ${isStreaming ? 'thinking-streaming' : ''}`}>
        <button
          type="button"
          className="thinking-header"
          onClick={this.toggleExpanded}
          aria-expanded={isExpanded}
        >
          <span className="thinking-title">Thinking Process..</span>
          <span className="thinking-toggle" aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </span>
        </button>
        <div className="thinking-panel" aria-hidden={!isExpanded}>
          {isExpanded && (
            <div className="thinking-content">
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ThinkingBlock;
