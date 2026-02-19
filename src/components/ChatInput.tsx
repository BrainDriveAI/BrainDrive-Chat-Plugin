import React from 'react';
import { ModelInfo, RagCollection, LibraryProject, LibraryScope } from '../types';
import { CheckIcon, ChevronRightIcon, DatabaseIcon, LibraryIcon, PageAddIcon, PersonaIcon, PlusIcon, SearchIcon, SendIcon, StopIcon, UploadIcon } from '../icons';

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
  webSearchDisabled?: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;

  // RAG (collections) props
  ragEnabled?: boolean;
  ragCollections: RagCollection[];
  ragCollectionsLoading: boolean;
  ragCollectionsError: string | null;
  selectedRagCollectionId: string | null;
  onRagSelectCollection: (collectionId: string | null) => void;
  onRagCreateCollection: () => void;
  onRagManageDocuments: (collectionId: string) => void;
  onRagRefreshCollections?: () => void;
  
  // Persona props
  personas: any[];
  selectedPersona: any;
  onPersonaChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPersonaToggle?: () => void;
  showPersonaSelection: boolean;
  lockPersonaSelection?: boolean;

  // Library props
  libraryScope?: LibraryScope;
  libraryProjects?: LibraryProject[];
  libraryLifeScopes?: LibraryProject[];
  onLibraryToggle?: () => void;
  onLibrarySelectProject?: (project: LibraryProject | null) => void;
  onOpenCreateLibraryPage?: () => void;
  lockProjectScope?: boolean;
}

interface ChatInputState {
  isMenuOpen: boolean;
  showPersonaSelector: boolean;
  isMultiline: boolean;
  isRagMenuOpen: boolean;
  openRagCollectionId: string | null;
  isLibraryMenuOpen: boolean;
  openLibraryScopeGroup: 'life' | 'projects' | null;
}

class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
  private menuRef = React.createRef<HTMLDivElement>();

  constructor(props: ChatInputProps) {
    super(props);
    this.state = {
      isMenuOpen: false,
      showPersonaSelector: false,
      isMultiline: false,
      isRagMenuOpen: false,
      openRagCollectionId: null,
      isLibraryMenuOpen: false,
      openLibraryScopeGroup: null,
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
      this.setState({ isMenuOpen: false, isRagMenuOpen: false, openRagCollectionId: null, isLibraryMenuOpen: false, openLibraryScopeGroup: null });
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
    this.setState(prevState => ({
      isMenuOpen: !prevState.isMenuOpen,
      isRagMenuOpen: false,
      openRagCollectionId: null,
      isLibraryMenuOpen: false, openLibraryScopeGroup: null,
    }), () => {
      if (this.state.isMenuOpen && this.props.onRagRefreshCollections) {
        this.props.onRagRefreshCollections();
      }
    });
  };

  handleFileUpload = () => {
    if (this.props.onFileUpload) {
      this.props.onFileUpload();
    }
    this.setState({ isMenuOpen: false, isRagMenuOpen: false, openRagCollectionId: null, isLibraryMenuOpen: false, openLibraryScopeGroup: null });
  };

  handleWebSearchToggle = () => {
    if (this.props.webSearchDisabled) {
      this.setState({ isMenuOpen: false, isRagMenuOpen: false, openRagCollectionId: null, isLibraryMenuOpen: false, openLibraryScopeGroup: null });
      return;
    }
    if (this.props.onToggleWebSearch) {
      this.props.onToggleWebSearch();
    }
    this.setState({ isMenuOpen: false, isRagMenuOpen: false, openRagCollectionId: null, isLibraryMenuOpen: false, openLibraryScopeGroup: null });
  };

  handlePersonaToggle = () => {
    if (this.props.lockPersonaSelection) {
      this.closeAllMenus();
      return;
    }

    this.setState(prevState => {
      const newShowPersonaSelector = !prevState.showPersonaSelector;
      
      // If turning off persona selector, reset the persona
      if (!newShowPersonaSelector && this.props.onPersonaToggle) {
        this.props.onPersonaToggle();
      }
      
      console.log(`🎭 ChatInput: Persona toggle - newShowPersonaSelector: ${newShowPersonaSelector}`);
      
      return {
        showPersonaSelector: newShowPersonaSelector,
        isMenuOpen: false,
        isRagMenuOpen: false,
        openRagCollectionId: null,
        isLibraryMenuOpen: false, openLibraryScopeGroup: null,
      };
    });
  };

  handlePersonaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (this.props.lockPersonaSelection) {
      return;
    }

    this.props.onPersonaChange(event);
  };

  openRagMenu = () => {
    if (this.props.ragEnabled === false) return;
    this.setState({ isRagMenuOpen: true, openRagCollectionId: null, isLibraryMenuOpen: false, openLibraryScopeGroup: null });
    if (this.props.onRagRefreshCollections) {
      this.props.onRagRefreshCollections();
    }
  };

  openRagCollectionMenu = (collectionId: string) => {
    if (this.props.ragEnabled === false) return;
    this.setState({ isRagMenuOpen: true, openRagCollectionId: collectionId });
  };

  closeAllMenus = () => {
    this.setState({ isMenuOpen: false, isRagMenuOpen: false, openRagCollectionId: null, isLibraryMenuOpen: false, openLibraryScopeGroup: null });
  };

  openLibraryMenu = () => {
    this.setState({
      isLibraryMenuOpen: true,
      isRagMenuOpen: false,
      openRagCollectionId: null,
      openLibraryScopeGroup: null,
    });
  };

  openLibraryScopeGroup = (group: 'life' | 'projects') => {
    this.setState((prevState) => ({
      isLibraryMenuOpen: true,
      isRagMenuOpen: false,
      openRagCollectionId: null,
      openLibraryScopeGroup: prevState.openLibraryScopeGroup === group ? null : group,
    }));
  };

  handleLibrarySelectAll = () => {
    if (this.props.lockProjectScope) {
      this.closeAllMenus();
      return;
    }
    this.closeAllMenus();
    if (this.props.onLibrarySelectProject) {
      this.props.onLibrarySelectProject(null); // null = "All", also sets enabled: true
    }
  };

  handleLibrarySelectProject = (project: LibraryProject) => {
    if (this.props.lockProjectScope) {
      this.closeAllMenus();
      return;
    }
    this.closeAllMenus();
    if (this.props.onLibrarySelectProject) {
      this.props.onLibrarySelectProject(project); // also sets enabled: true
    }
  };

  handleLibraryDisable = () => {
    if (this.props.lockProjectScope) {
      this.closeAllMenus();
      return;
    }
    this.closeAllMenus();
    if (this.props.onLibraryToggle && this.props.libraryScope?.enabled) {
      this.props.onLibraryToggle();
    }
  };

  handleOpenCreateLibraryPage = () => {
    this.closeAllMenus();
    if (this.props.onOpenCreateLibraryPage) {
      this.props.onOpenCreateLibraryPage();
    }
  };

  private getLibraryScopeLabel(project: LibraryProject | null | undefined): string {
    if (!project) {
      return 'All';
    }

    if (project.scope_root === 'life') {
      return `Life / ${project.name}`;
    }

    return `Projects / ${project.name}`;
  }

  private isLibraryScopeSelected(project: LibraryProject): boolean {
    const selected = this.props.libraryScope?.project;
    if (!this.props.libraryScope?.enabled || !selected) {
      return false;
    }

    const selectedRoot = selected.scope_root || 'projects';
    const projectRoot = project.scope_root || 'projects';
    if (selectedRoot !== projectRoot) {
      return false;
    }

    if (selected.path && project.path) {
      return selected.path === project.path;
    }

    return selected.slug === project.slug;
  }

  private renderLibraryScopeSection(
    title: string,
    projects: LibraryProject[],
    options: {
      emptyLabel?: string;
      nestedClassName?: string;
      nested?: boolean;
      includeTitle?: boolean;
    } = {}
  ): React.ReactNode {
    const emptyLabel = options.emptyLabel || 'No scopes found';
    const nestedClassName = options.nestedClassName || '';
    const nested = options.nested !== false;
    const includeTitle = options.includeTitle !== false;
    const itemClassName = ['menu-item', nested ? 'menu-item-nested' : '', nestedClassName].filter(Boolean).join(' ');

    return (
      <>
        {includeTitle && <div className="menu-section-title">{title}</div>}
        {!projects.length ? (
          <button className={itemClassName} disabled>
            <div className="menu-item-text">
              <span className="menu-item-subtext">{emptyLabel}</span>
            </div>
          </button>
        ) : (
          projects.map((project) => {
            const isSelected = this.isLibraryScopeSelected(project);
            const key = `${project.scope_root || 'projects'}:${project.path || project.slug}`;
            return (
              <button
                key={key}
                className={itemClassName}
                onClick={() => this.handleLibrarySelectProject(project)}
                disabled={this.props.isLoading || this.props.isLoadingHistory || !!this.props.lockProjectScope}
                title={project.path || project.name}
              >
                <span className="menu-item-title">{project.name}</span>
                <span className="menu-item-right">
                  {isSelected && <span className="menu-item-check"><CheckIcon /></span>}
                </span>
              </button>
            );
          })
        )}
      </>
    );
  }

  handleRagClearSelection = () => {
    this.props.onRagSelectCollection(null);
    this.closeAllMenus();
  };

  handleRagCreateCollection = () => {
    this.props.onRagCreateCollection();
    this.closeAllMenus();
  };

  handleRagManageDocuments = (collectionId: string) => {
    this.props.onRagManageDocuments(collectionId);
    this.closeAllMenus();
  };

  handleRagSelectCollection = (collectionId: string) => {
    this.props.onRagSelectCollection(collectionId);
    this.closeAllMenus();
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
      webSearchDisabled,
      inputRef,
      ragEnabled,
      ragCollections,
      ragCollectionsLoading,
      ragCollectionsError,
      selectedRagCollectionId,
      personas,
      selectedPersona,
      onPersonaChange,
      showPersonaSelection,
      lockPersonaSelection,
      lockProjectScope
    } = this.props;

    // Menu helpers
    const isRagEnabled = ragEnabled !== false;

    const selectedRagCollection = selectedRagCollectionId
      ? ragCollections.find((collection) => collection.id === selectedRagCollectionId) || null
      : null;
    const ragMenuSubtext = !isRagEnabled
      ? 'RAG unavailable'
      : selectedRagCollection
        ? `Selected: ${selectedRagCollection.name}`
        : selectedRagCollectionId
          ? 'Selected collection'
          : 'Select a collection to enable RAG';

    const libraryLifeScopes = (this.props.libraryLifeScopes || []).map((scope) => ({
      ...scope,
      scope_root: 'life' as const,
    }));
    const libraryProjectScopes = (this.props.libraryProjects || []).map((scope) => ({
      ...scope,
      scope_root: scope.scope_root || 'projects',
    }));
    const selectedLibraryScopeLabel = this.getLibraryScopeLabel(this.props.libraryScope?.project);
    const hasActiveLibraryScope = Boolean(this.props.libraryScope?.enabled);

    return (
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <div className={`input-with-buttons ${hasActiveLibraryScope ? 'has-library-scope' : ''}`.trim()}>
            <div className={`chat-input-row ${this.state.isMultiline ? 'multiline' : ''}`}>
              {/* Left feature action */}
              <div className="menu-container" ref={this.menuRef}>
                <button
                  type="button"
                  className="input-button icon-button feature-button"
                  onClick={this.toggleMenu}
                  aria-label="Open feature menu"
                  aria-expanded={this.state.isMenuOpen}
                  disabled={isLoading || isLoadingHistory}
                >
                  <PlusIcon />
                </button>

                {this.state.isMenuOpen && (
                  <div className="dropdown-menu feature-menu">
                    <button
                      className="menu-item menu-item-has-submenu"
                      onClick={this.openRagMenu}
                      disabled={isLoading || isLoadingHistory || !isRagEnabled}
                    >
                      <DatabaseIcon />
                      <div className="menu-item-text">
                        <span className="menu-item-title">RAG</span>
                        <span className="menu-item-subtext">{ragMenuSubtext}</span>
                      </div>
                      <span className="menu-item-right">
                        <ChevronRightIcon />
                      </span>
                    </button>
                    <button className="menu-item" onClick={this.handleFileUpload} disabled={isLoading || isLoadingHistory}>
                      <UploadIcon />
                      <div className="menu-item-text">
                        <span className="menu-item-title">Attach file</span>
                        <span className="menu-item-subtext">Upload docs to ground responses</span>
                      </div>
                    </button>
                    <button className="menu-item" onClick={this.handleWebSearchToggle} disabled={isLoading || isLoadingHistory || !!webSearchDisabled}>
                      <SearchIcon isActive={useWebSearch} />
                      <div className="menu-item-text">
                        <span className="menu-item-title">Web search</span>
                        <span className="menu-item-subtext">
                          {webSearchDisabled ? 'Disabled for now' : `${useWebSearch ? 'Disable' : 'Enable'} live search for answers`}
                        </span>
                      </div>
                    </button>
                    {showPersonaSelection && (
                      <button className="menu-item" onClick={this.handlePersonaToggle} disabled={isLoading || isLoadingHistory || !!lockPersonaSelection}>
                        <PersonaIcon />
                        <div className="menu-item-text">
                          <span className="menu-item-title">Personas</span>
                          <span className="menu-item-subtext">
                            {this.state.showPersonaSelector ? 'Hide selector' : 'Choose a voice'}
                          </span>
                        </div>
                      </button>
                    )}
                    <button
                      className="menu-item menu-item-has-submenu"
                      onClick={this.openLibraryMenu}
                      disabled={isLoading || isLoadingHistory}
                    >
                      <LibraryIcon />
                      <div className="menu-item-text">
                        <span className="menu-item-title">Library</span>
                        <span className="menu-item-subtext">
                          {this.props.libraryScope?.enabled
                            ? `Scope: ${selectedLibraryScopeLabel}`
                            : 'Access your local Library'}
                        </span>
                      </div>
                      <span className="menu-item-right">
                        <ChevronRightIcon />
                      </span>
                    </button>

                    {/* Library submenu */}
                    {this.state.isLibraryMenuOpen && (
                      <div className="dropdown-menu feature-menu menu-submenu" role="menu">
                        <button className="menu-item" onClick={this.handleOpenCreateLibraryPage} disabled={isLoading || isLoadingHistory}>
                          <PageAddIcon />
                          <div className="menu-item-text">
                            <span className="menu-item-title">Create Library Page...</span>
                            <span className="menu-item-subtext">Build a page with chat defaults</span>
                          </div>
                        </button>
                        <div className="menu-divider" />
                        <button className="menu-item" onClick={this.handleLibrarySelectAll} disabled={isLoading || isLoadingHistory || !!lockProjectScope}>
                          <span className="menu-item-title">All</span>
                          <span className="menu-item-right">
                            {this.props.libraryScope?.enabled && !this.props.libraryScope?.project && (
                              <span className="menu-item-check"><CheckIcon /></span>
                            )}
                          </span>
                        </button>
                        <div className="menu-divider" />
                        <button
                          className="menu-item menu-item-has-submenu"
                          onClick={() => this.openLibraryScopeGroup('life')}
                          disabled={isLoading || isLoadingHistory}
                        >
                          <div className="menu-item-text">
                            <span className="menu-item-title">Life</span>
                            <span className="menu-item-subtext">
                              {libraryLifeScopes.length
                                ? `${libraryLifeScopes.length} scope${libraryLifeScopes.length === 1 ? '' : 's'}`
                                : 'No life topics yet'}
                            </span>
                          </div>
                          <span className="menu-item-right">
                            {this.props.libraryScope?.enabled && this.props.libraryScope?.project?.scope_root === 'life' && (
                              <span className="menu-item-check"><CheckIcon /></span>
                            )}
                            <ChevronRightIcon />
                          </span>
                        </button>
                        <button
                          className="menu-item menu-item-has-submenu"
                          onClick={() => this.openLibraryScopeGroup('projects')}
                          disabled={isLoading || isLoadingHistory}
                        >
                          <div className="menu-item-text">
                            <span className="menu-item-title">Projects</span>
                            <span className="menu-item-subtext">
                              {libraryProjectScopes.length
                                ? `${libraryProjectScopes.length} scope${libraryProjectScopes.length === 1 ? '' : 's'}`
                                : 'No projects yet'}
                            </span>
                          </div>
                          <span className="menu-item-right">
                            {this.props.libraryScope?.enabled && this.props.libraryScope?.project?.scope_root !== 'life' && this.props.libraryScope?.project && (
                              <span className="menu-item-check"><CheckIcon /></span>
                            )}
                            <ChevronRightIcon />
                          </span>
                        </button>
                        {this.state.openLibraryScopeGroup === 'life' && (
                          <div className="dropdown-menu feature-menu menu-submenu" role="menu">
                            {this.renderLibraryScopeSection('Life', libraryLifeScopes, {
                              emptyLabel: 'No life topics yet',
                              nestedClassName: 'menu-item-life-scope',
                              nested: false,
                              includeTitle: false,
                            })}
                          </div>
                        )}
                        {this.state.openLibraryScopeGroup === 'projects' && (
                          <div className="dropdown-menu feature-menu menu-submenu" role="menu">
                            {this.renderLibraryScopeSection('Projects', libraryProjectScopes, {
                              emptyLabel: 'No projects yet',
                              nestedClassName: 'menu-item-project-scope',
                              nested: false,
                              includeTitle: false,
                            })}
                          </div>
                        )}
                        {this.props.libraryScope?.enabled && (
                          <>
                            <div className="menu-divider" />
                            <button className="menu-item" onClick={this.handleLibraryDisable} disabled={isLoading || isLoadingHistory || !!lockProjectScope}>
                              <span className="menu-item-title">Disable Library</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* RAG submenu */}
                    {isRagEnabled && this.state.isRagMenuOpen && (
                      <div className="dropdown-menu feature-menu menu-submenu" role="menu">
                        <button className="menu-item" onClick={this.handleRagClearSelection} disabled={isLoading || isLoadingHistory}>
                          <span className="menu-item-title">No collection</span>
                          <span className="menu-item-right">
                            {!selectedRagCollectionId && <span className="menu-item-check"><CheckIcon /></span>}
                          </span>
                        </button>

                        <button className="menu-item" onClick={this.handleRagCreateCollection} disabled={isLoading || isLoadingHistory}>
                          <span className="menu-item-title">Create Collection…</span>
                        </button>

                        <div className="menu-divider" />

                        {ragCollectionsLoading && (
                          <button className="menu-item" disabled>
                            <span className="menu-item-title">Loading collections…</span>
                          </button>
                        )}

                        {!ragCollectionsLoading && ragCollectionsError && (
                          <button className="menu-item" disabled title={ragCollectionsError}>
                            <div className="menu-item-text">
                              <span className="menu-item-title">Unable to load collections</span>
                              <span className="menu-item-subtext">{ragCollectionsError}</span>
                            </div>
                          </button>
                        )}

                        {!ragCollectionsLoading && !ragCollectionsError && ragCollections.length === 0 && (
                          <button className="menu-item" disabled>
                            <div className="menu-item-text">
                              <span className="menu-item-title">No collections yet</span>
                              <span className="menu-item-subtext">Create one to enable RAG</span>
                            </div>
                          </button>
                        )}

                        {!ragCollectionsLoading && !ragCollectionsError && ragCollections.map((collection) => {
                          const isSelected = selectedRagCollectionId === collection.id;
                          return (
                            <button
                              key={collection.id}
                              className="menu-item menu-item-has-submenu"
                              onClick={() => this.openRagCollectionMenu(collection.id)}
                              disabled={isLoading || isLoadingHistory}
                              title={collection.description || collection.name}
                            >
                              <span className="menu-item-title">{collection.name}</span>
                              <span className="menu-item-right">
                                {isSelected && <span className="menu-item-check"><CheckIcon /></span>}
                                <ChevronRightIcon />
                              </span>
                            </button>
                          );
                        })}

                        {/* Collection submenu */}
                        {this.state.openRagCollectionId && (
                          <div className="dropdown-menu feature-menu menu-submenu" role="menu">
                            <button
                              className="menu-item"
                              onClick={() => this.handleRagManageDocuments(this.state.openRagCollectionId!)}
                              disabled={isLoading || isLoadingHistory}
                            >
                              <span className="menu-item-title">Manage Documents…</span>
                            </button>
                            <button
                              className="menu-item"
                              onClick={() => this.handleRagSelectCollection(this.state.openRagCollectionId!)}
                              disabled={isLoading || isLoadingHistory}
                            >
                              <span className="menu-item-title">Select</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Persona Selector - optional inline control */}
              {showPersonaSelection && (
                <select
                  value={selectedPersona?.id || ''}
                  onChange={this.handlePersonaChange}
                  className="persona-selector"
                  disabled={isLoading || isLoadingHistory || !!lockPersonaSelection}
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
                type="button"
              >
                {isStreaming ? <StopIcon /> : <SendIcon />}
              </button>
            </div>
            {this.props.libraryScope?.enabled && (
              <div className="library-scope-indicator" data-testid="library-scope-indicator">
                <LibraryIcon />
                <span>Library: {selectedLibraryScopeLabel}</span>
                <button
                  className="library-scope-close"
                  onClick={this.handleLibraryDisable}
                  title={lockProjectScope ? 'Library scope is locked for this page' : 'Disable Library'}
                  type="button"
                  disabled={!!lockProjectScope}
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ChatInput;
