import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../components/ChatInput';

// Minimal props factory
const defaultProps = (): React.ComponentProps<typeof ChatInput> => ({
  inputText: '',
  isLoading: false,
  isLoadingHistory: false,
  isStreaming: false,
  selectedModel: { name: 'test', provider: 'test', providerId: 'test', serverName: 'test', serverId: 'test' },
  onInputChange: jest.fn(),
  onKeyPress: jest.fn(),
  onSendMessage: jest.fn(),
  onStopGeneration: jest.fn(),
  onFileUpload: jest.fn(),
  onToggleWebSearch: jest.fn(),
  useWebSearch: false,
  inputRef: React.createRef<HTMLTextAreaElement>(),
  ragEnabled: true,
  ragCollections: [],
  ragCollectionsLoading: false,
  ragCollectionsError: null,
  selectedRagCollectionId: null,
  onRagSelectCollection: jest.fn(),
  onRagCreateCollection: jest.fn(),
  onRagManageDocuments: jest.fn(),
  personas: [],
  selectedPersona: null,
  onPersonaChange: jest.fn(),
  showPersonaSelection: false,
  // Library props
  libraryScope: { enabled: false, project: null },
  libraryProjects: [
    { name: 'Alpha', slug: 'alpha', lifecycle: 'active', path: 'projects/active/alpha', scope_root: 'projects', has_agent_md: true, has_spec: true, has_build_plan: false, has_decisions: false },
    { name: 'Beta', slug: 'beta', lifecycle: 'active', path: 'projects/active/beta', scope_root: 'projects', has_agent_md: true, has_spec: false, has_build_plan: false, has_decisions: false },
  ],
  libraryLifeScopes: [
    { name: 'Finances', slug: 'finances', lifecycle: 'active', path: 'life/finances', scope_root: 'life', has_agent_md: true, has_spec: true, has_build_plan: true, has_decisions: false },
    { name: 'Fitness', slug: 'fitness', lifecycle: 'active', path: 'life/fitness', scope_root: 'life', has_agent_md: true, has_spec: true, has_build_plan: true, has_decisions: false },
  ],
  onLibraryToggle: jest.fn(),
  onLibrarySelectProject: jest.fn(),
  onOpenCreateLibraryPage: jest.fn(),
});

describe('Library Integration in ChatInput', () => {
  test('"+" menu shows Library option', () => {
    render(<ChatInput {...defaultProps()} />);
    const plusButton = screen.getByLabelText('Open feature menu');
    fireEvent.click(plusButton);
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  test('Project selection submenu shows Life and Projects sections', () => {
    render(<ChatInput {...defaultProps()} />);
    const plusButton = screen.getByLabelText('Open feature menu');
    fireEvent.click(plusButton);
    const libraryItem = screen.getByText('Library').closest('button')!;
    fireEvent.click(libraryItem);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Life')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Finances')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  test('Visual indicator shows when Library is active', () => {
    const props = defaultProps();
    props.libraryScope = { enabled: true, project: props.libraryProjects![0] };
    render(<ChatInput {...props} />);
    const indicator = screen.getByTestId('library-scope-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toContain('Alpha');
  });

  test('Visual indicator shows "All" when no specific project', () => {
    const props = defaultProps();
    props.libraryScope = { enabled: true, project: null };
    render(<ChatInput {...props} />);
    const indicator = screen.getByTestId('library-scope-indicator');
    expect(indicator.textContent).toContain('All');
  });

  test('Disable Library clears scope via toggle callback', () => {
    const props = defaultProps();
    props.libraryScope = { enabled: true, project: null };
    render(<ChatInput {...props} />);
    const closeBtn = screen.getByTitle('Disable Library');
    fireEvent.click(closeBtn);
    expect(props.onLibraryToggle).toHaveBeenCalled();
  });

  test('No visual indicator when Library is disabled', () => {
    render(<ChatInput {...defaultProps()} />);
    expect(screen.queryByTestId('library-scope-indicator')).not.toBeInTheDocument();
  });

  test('Create library page action remains available when project scope is locked', () => {
    const props = defaultProps();
    props.lockProjectScope = true;
    render(<ChatInput {...props} />);

    const plusButton = screen.getByLabelText('Open feature menu');
    fireEvent.click(plusButton);
    const libraryButton = screen.getByText('Library').closest('button');
    fireEvent.click(libraryButton!);

    expect(libraryButton).toBeEnabled();
    expect(screen.getByText('Create Library Page...')).toBeInTheDocument();
    const allButton = screen.getByText('All').closest('button');
    expect(allButton).toBeDisabled();
  });

  test('Locked Library scope cannot be disabled from indicator', () => {
    const props = defaultProps();
    props.lockProjectScope = true;
    props.libraryScope = { enabled: true, project: null };
    render(<ChatInput {...props} />);

    const closeBtn = screen.getByTitle('Library scope is locked for this page');
    expect(closeBtn).toBeDisabled();
    fireEvent.click(closeBtn);
    expect(props.onLibraryToggle).not.toHaveBeenCalled();
  });
});
