import React from 'react';
import SearchableDropdown, { DropdownOption } from './SearchableDropdown';
import { CloseIcon } from '../icons';
import { resolveConversationType, validateLibraryPageForm } from '../utils/libraryPageForm';

export interface LibraryPageModalValues {
  pageName: string;
  routeSlug: string;
  publishImmediately: boolean;
  openAfterCreate: boolean;
  conversationType: string;
  defaultLibraryScopeEnabled: boolean;
  defaultProjectSlug: string | null;
  defaultProjectLifecycle: string;
  defaultPersonaId: string | null;
  defaultModelKey: string | null;
  applyDefaultsOnNewChat: boolean;
  lockProjectScope: boolean;
  lockPersonaSelection: boolean;
  lockModelSelection: boolean;
}

interface CreateLibraryPageModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  projectOptions: DropdownOption[];
  personaOptions: DropdownOption[];
  modelOptions: DropdownOption[];
  onClose: () => void;
  onSubmit: (values: LibraryPageModalValues) => void | Promise<void>;
}

interface CreateLibraryPageModalState {
  activeTab: 'basic' | 'advanced';
  pageName: string;
  routeSlug: string;
  publishImmediately: boolean;
  openAfterCreate: boolean;
  conversationType: string;
  conversationTypeTouched: boolean;
  defaultLibraryScopeEnabled: boolean;
  defaultProjectSlug: string;
  defaultProjectLifecycle: string;
  defaultPersonaId: string;
  defaultModelKey: string;
  applyDefaultsOnNewChat: boolean;
  lockProjectScope: boolean;
  lockPersonaSelection: boolean;
  lockModelSelection: boolean;
  localError: string | null;
}

const FIELD_INFO = {
  pageName: 'Required. This is the display name users will see in page lists and navigation.',
  routeSlug: 'Optional. URL path segment for the page. Leave blank to auto-generate from page name.',
  publishImmediately: 'When enabled, the page is published right after creation.',
  openAfterCreate: 'When enabled, navigates directly to the new page after creation.',
  conversationType: 'Required and should be unique per page to isolate conversation history. Example: finance-research-k9f3t2.',
  defaultLibraryScopeEnabled: 'Enable this to apply Library project scope defaults on this page.',
  defaultProjectSlug: 'Optional. Choose a default Library project (or All) when scope defaults are enabled.',
  defaultProjectLifecycle: 'Lifecycle used to resolve the default project slug.',
  defaultPersonaId: 'Optional. Select a default persona for new chats on this page.',
  defaultModelKey: 'Optional. Select a default model for new chats on this page.',
  applyDefaultsOnNewChat: 'Re-applies page defaults whenever a new chat is started.',
  lockProjectScope: 'Prevents users from changing Library project scope on this page.',
  lockPersonaSelection: 'Prevents users from changing persona selection on this page.',
  lockModelSelection: 'Prevents users from changing model selection on this page.',
} as const;

class CreateLibraryPageModal extends React.Component<
  CreateLibraryPageModalProps,
  CreateLibraryPageModalState
> {
  state: CreateLibraryPageModalState = this.buildInitialState();

  private buildInitialState(): CreateLibraryPageModalState {
    return {
      activeTab: 'basic',
      pageName: '',
      routeSlug: '',
      publishImmediately: true,
      openAfterCreate: true,
      conversationType: this.buildUniqueConversationType('library-chat'),
      conversationTypeTouched: false,
      defaultLibraryScopeEnabled: true,
      defaultProjectSlug: '',
      defaultProjectLifecycle: 'active',
      defaultPersonaId: '',
      defaultModelKey: '',
      applyDefaultsOnNewChat: true,
      lockProjectScope: false,
      lockPersonaSelection: false,
      lockModelSelection: false,
      localError: null,
    };
  }

  componentDidUpdate(prevProps: CreateLibraryPageModalProps) {
    if (this.props.isOpen && !prevProps.isOpen) {
      this.setState(this.buildInitialState());
    }
  }

  private slugifyToken(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private buildUniqueConversationType(seed: string): string {
    const normalizedSeed = this.slugifyToken(seed) || 'library-chat';
    const timePart = Date.now().toString(36).slice(-6);
    const randomPart = Math.floor(Math.random() * 46656).toString(36).padStart(3, '0');
    return `${normalizedSeed}-${timePart}${randomPart}`;
  }

  private handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !this.props.isSubmitting) {
      this.props.onClose();
    }
  };

  private handlePageNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPageName = event.target.value;
    if (this.state.conversationTypeTouched) {
      this.setState({ pageName: nextPageName });
      return;
    }

    this.setState({
      pageName: nextPageName,
      conversationType: this.buildUniqueConversationType(nextPageName || 'library-chat'),
    });
  };

  private validateBeforeSubmit(): string | null {
    return validateLibraryPageForm({
      pageName: this.state.pageName,
      conversationType: this.state.conversationType,
      defaultProjectSlug: this.state.defaultProjectSlug,
      defaultPersonaId: this.state.defaultPersonaId,
      defaultModelKey: this.state.defaultModelKey,
      projectOptions: this.props.projectOptions,
      personaOptions: this.props.personaOptions,
      modelOptions: this.props.modelOptions,
    });
  }

  private handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (this.props.isSubmitting) {
      return;
    }

    const validationError = this.validateBeforeSubmit();
    if (validationError) {
      this.setState({ localError: validationError });
      return;
    }

    this.setState({ localError: null });

    await this.props.onSubmit({
      pageName: this.state.pageName.trim(),
      routeSlug: this.state.routeSlug.trim(),
      publishImmediately: this.state.publishImmediately,
      openAfterCreate: this.state.openAfterCreate,
      conversationType: resolveConversationType(this.state.conversationType),
      defaultLibraryScopeEnabled: this.state.defaultLibraryScopeEnabled,
      defaultProjectSlug: this.state.defaultProjectSlug || null,
      defaultProjectLifecycle: this.state.defaultProjectLifecycle || 'active',
      defaultPersonaId: this.state.defaultPersonaId || null,
      defaultModelKey: this.state.defaultModelKey || null,
      applyDefaultsOnNewChat: this.state.applyDefaultsOnNewChat,
      lockProjectScope: this.state.lockProjectScope,
      lockPersonaSelection: this.state.lockPersonaSelection,
      lockModelSelection: this.state.lockModelSelection,
    });
  };

  private renderFieldLabel(label: string, info: string, htmlFor?: string) {
    return (
      <label className="modal-field-label modal-field-label-row" htmlFor={htmlFor}>
        <span>{label}</span>
        <span className="modal-info-icon" role="img" aria-label={info} title={info}>i</span>
      </label>
    );
  }

  private renderFieldHelp(info: string) {
    return <div className="modal-field-help">{info}</div>;
  }

  render() {
    if (!this.props.isOpen) {
      return null;
    }

    const errorMessage = this.state.localError || this.props.errorMessage || null;

    return (
      <div
        className="modal-overlay"
        onMouseDown={this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-content modal-lg">
          <div className="modal-header">
            <h3 className="modal-title">Create Library Page</h3>
            <button
              type="button"
              className="modal-close"
              onClick={this.props.onClose}
              aria-label="Close"
              disabled={this.props.isSubmitting}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body">
            <form className="modal-form" onSubmit={this.handleSubmit}>
              <div className="library-page-tabs" role="tablist" aria-label="Create Library Page tabs">
                <button
                  type="button"
                  role="tab"
                  className={`library-page-tab ${this.state.activeTab === 'basic' ? 'active' : ''}`}
                  aria-selected={this.state.activeTab === 'basic'}
                  onClick={() => this.setState({ activeTab: 'basic' })}
                  disabled={this.props.isSubmitting}
                >
                  Basic
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`library-page-tab ${this.state.activeTab === 'advanced' ? 'active' : ''}`}
                  aria-selected={this.state.activeTab === 'advanced'}
                  onClick={() => this.setState({ activeTab: 'advanced' })}
                  disabled={this.props.isSubmitting}
                >
                  Advanced
                </button>
              </div>

              {this.state.activeTab === 'basic' && (
                <>
                  {this.renderFieldLabel('Page Name', FIELD_INFO.pageName, 'library-page-name')}
                  <input
                    id="library-page-name"
                    className="modal-input"
                    value={this.state.pageName}
                    onChange={this.handlePageNameChange}
                    placeholder="e.g. Finance Research Chat"
                    autoFocus
                    disabled={this.props.isSubmitting}
                  />
                  {this.renderFieldHelp(FIELD_INFO.pageName)}

                  {this.renderFieldLabel('Default Persona', FIELD_INFO.defaultPersonaId)}
                  <SearchableDropdown
                    id="library-default-persona"
                    value={this.state.defaultPersonaId}
                    options={this.props.personaOptions}
                    onSelect={(value) => this.setState({ defaultPersonaId: value })}
                    placeholder="None"
                    searchPlaceholder="Search personas"
                    noResultsText="No personas found"
                    disabled={this.props.isSubmitting}
                    triggerClassName="modal-input"
                  />
                  {this.renderFieldHelp(FIELD_INFO.defaultPersonaId)}

                  {this.renderFieldLabel('Default Model', FIELD_INFO.defaultModelKey)}
                  <SearchableDropdown
                    id="library-default-model"
                    value={this.state.defaultModelKey}
                    options={this.props.modelOptions}
                    onSelect={(value) => this.setState({ defaultModelKey: value })}
                    placeholder="None"
                    searchPlaceholder="Search models"
                    noResultsText="No models found"
                    disabled={this.props.isSubmitting}
                    triggerClassName="modal-input"
                  />
                  {this.renderFieldHelp(FIELD_INFO.defaultModelKey)}
                </>
              )}

              {this.state.activeTab === 'advanced' && (
                <>
                  {this.renderFieldLabel('Route Slug (Optional)', FIELD_INFO.routeSlug, 'library-page-route')}
                  <input
                    id="library-page-route"
                    className="modal-input"
                    value={this.state.routeSlug}
                    onChange={(event) => this.setState({ routeSlug: event.target.value })}
                    placeholder="finance-research-chat"
                    disabled={this.props.isSubmitting}
                  />
                  {this.renderFieldHelp(FIELD_INFO.routeSlug)}

                  <label className="modal-checkbox-row" htmlFor="library-page-publish">
                    <input
                      id="library-page-publish"
                      type="checkbox"
                      checked={this.state.publishImmediately}
                      onChange={(event) => this.setState({ publishImmediately: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Publish Immediately</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.publishImmediately} title={FIELD_INFO.publishImmediately}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.publishImmediately)}

                  <label className="modal-checkbox-row" htmlFor="library-page-open-after-create">
                    <input
                      id="library-page-open-after-create"
                      type="checkbox"
                      checked={this.state.openAfterCreate}
                      onChange={(event) => this.setState({ openAfterCreate: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Open After Create</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.openAfterCreate} title={FIELD_INFO.openAfterCreate}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.openAfterCreate)}

                  <div className="library-page-divider" />

                  {this.renderFieldLabel('Conversation Type', FIELD_INFO.conversationType, 'library-conversation-type')}
                  <input
                    id="library-conversation-type"
                    className="modal-input"
                    value={this.state.conversationType}
                    onChange={(event) => this.setState({ conversationType: event.target.value, conversationTypeTouched: true })}
                    placeholder="finance-research-k9f3t2"
                    disabled={this.props.isSubmitting}
                  />
                  {this.renderFieldHelp(FIELD_INFO.conversationType)}

                  <label className="modal-checkbox-row" htmlFor="library-default-library-enabled">
                    <input
                      id="library-default-library-enabled"
                      type="checkbox"
                      checked={this.state.defaultLibraryScopeEnabled}
                      onChange={(event) => this.setState({ defaultLibraryScopeEnabled: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Default Library Scope Enabled</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.defaultLibraryScopeEnabled} title={FIELD_INFO.defaultLibraryScopeEnabled}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.defaultLibraryScopeEnabled)}

                  {this.renderFieldLabel('Default Project', FIELD_INFO.defaultProjectSlug)}
                  <SearchableDropdown
                    id="library-default-project"
                    value={this.state.defaultProjectSlug}
                    options={this.props.projectOptions}
                    onSelect={(value) => this.setState({ defaultProjectSlug: value })}
                    placeholder="All"
                    searchPlaceholder="Search projects"
                    noResultsText="No projects found"
                    disabled={this.props.isSubmitting || !this.state.defaultLibraryScopeEnabled}
                    triggerClassName="modal-input"
                  />
                  {this.renderFieldHelp(FIELD_INFO.defaultProjectSlug)}

                  {this.renderFieldLabel('Default Project Lifecycle', FIELD_INFO.defaultProjectLifecycle, 'library-default-project-lifecycle')}
                  <select
                    id="library-default-project-lifecycle"
                    className="modal-input"
                    value={this.state.defaultProjectLifecycle}
                    onChange={(event) => this.setState({ defaultProjectLifecycle: event.target.value })}
                    disabled={this.props.isSubmitting}
                  >
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                  {this.renderFieldHelp(FIELD_INFO.defaultProjectLifecycle)}

                  <label className="modal-checkbox-row" htmlFor="library-apply-defaults-on-new-chat">
                    <input
                      id="library-apply-defaults-on-new-chat"
                      type="checkbox"
                      checked={this.state.applyDefaultsOnNewChat}
                      onChange={(event) => this.setState({ applyDefaultsOnNewChat: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Apply Defaults On New Chat</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.applyDefaultsOnNewChat} title={FIELD_INFO.applyDefaultsOnNewChat}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.applyDefaultsOnNewChat)}

                  <label className="modal-checkbox-row" htmlFor="library-lock-project-scope">
                    <input
                      id="library-lock-project-scope"
                      type="checkbox"
                      checked={this.state.lockProjectScope}
                      onChange={(event) => this.setState({ lockProjectScope: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Lock Project Scope</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.lockProjectScope} title={FIELD_INFO.lockProjectScope}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.lockProjectScope)}

                  <label className="modal-checkbox-row" htmlFor="library-lock-persona-selection">
                    <input
                      id="library-lock-persona-selection"
                      type="checkbox"
                      checked={this.state.lockPersonaSelection}
                      onChange={(event) => this.setState({ lockPersonaSelection: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Lock Persona Selection</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.lockPersonaSelection} title={FIELD_INFO.lockPersonaSelection}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.lockPersonaSelection)}

                  <label className="modal-checkbox-row" htmlFor="library-lock-model-selection">
                    <input
                      id="library-lock-model-selection"
                      type="checkbox"
                      checked={this.state.lockModelSelection}
                      onChange={(event) => this.setState({ lockModelSelection: event.target.checked })}
                      disabled={this.props.isSubmitting}
                    />
                    <span className="modal-checkbox-text">Lock Model Selection</span>
                    <span className="modal-info-icon" role="img" aria-label={FIELD_INFO.lockModelSelection} title={FIELD_INFO.lockModelSelection}>i</span>
                  </label>
                  {this.renderFieldHelp(FIELD_INFO.lockModelSelection)}
                </>
              )}

              {errorMessage && <div className="modal-error">{errorMessage}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={this.props.onClose}
                  disabled={this.props.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn modal-btn-primary"
                  disabled={this.props.isSubmitting}
                >
                  {this.props.isSubmitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default CreateLibraryPageModal;
