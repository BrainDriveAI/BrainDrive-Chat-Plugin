import React from 'react';

interface ThinkingBlockProps {
  children: string;
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

  toggleExpanded = () => {
    this.setState(prevState => ({
      isExpanded: !prevState.isExpanded
    }));
  };

  render() {
    const { children } = this.props;
    const { isExpanded } = this.state;
    
    // Remove the <think> and </think> tags from the content
    const content = children.replace(/<\/?think>/g, '').trim();

    return (
      <div className={`thinking-block ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="thinking-header" onClick={this.toggleExpanded}>
          <span>Thinking Process</span>
          <span className="thinking-toggle">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        {isExpanded && (
          <div className="thinking-content">
            {content}
          </div>
        )}
      </div>
    );
  }
}

export default ThinkingBlock;
