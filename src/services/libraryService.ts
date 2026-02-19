import { ApiService, ApiResponse } from '../types';

export interface LibraryProject {
  name: string;
  slug: string;
  lifecycle: string;
  path: string;
  scope_root?: 'projects' | 'life';
  has_agent_md: boolean;
  has_spec: boolean;
  has_build_plan: boolean;
  has_decisions: boolean;
}

export interface LibraryProjectContext {
  success: boolean;
  project: string;
  lifecycle: string;
  files: Record<string, { content: string; size: number }>;
}

export interface LibraryScopeStatusTask {
  id?: number;
  title: string;
  priority?: string | null;
  due?: string | null;
  scope_path?: string | null;
  scope_root?: 'projects' | 'life' | null;
  scope_name?: string | null;
}

export interface LibraryScopeStatusOnboarding {
  topic: string;
  title: string;
  status: string;
  needs_interview: boolean;
  start_prompt: string;
}

export interface LibraryScopeStatus {
  success: boolean;
  scope_path: string;
  scope_root: 'projects' | 'life';
  scope_name: string;
  onboarding: LibraryScopeStatusOnboarding | null;
  open_tasks: {
    count: number;
    tasks: LibraryScopeStatusTask[];
  };
  warnings: Array<{ code: string; message: string }>;
}

export interface LibraryProjectProvisionInput {
  slug?: string | null;
  name?: string | null;
  lifecycle?: string | null;
  path?: string | null;
}

export interface LibraryProjectProvisionResult {
  success: boolean;
  created: boolean;
  existing: boolean;
  path: string;
  slug: string;
  lifecycle: string;
  project: LibraryProject | null;
}

export class LibraryService {
  private api: ApiService | undefined;

  constructor(api?: ApiService) {
    this.api = api;
  }

  private ensureApi(): ApiService {
    if (!this.api) {
      throw new Error('API service not available');
    }
    return this.api;
  }

  private slugify(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private normalizePath(value: string): string {
    return String(value || '').trim().replace(/\\+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private unwrapPayload(response: any): any {
    if (!response || typeof response !== 'object') {
      return response;
    }

    if (response.data && typeof response.data === 'object') {
      return response.data;
    }

    return response;
  }

  private extractErrorMessage(payload: any): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const direct = payload.message;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }

    const detail = payload.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }

    if (detail && typeof detail === 'object') {
      const nested = (detail as any).message;
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim();
      }
    }

    const error = payload.error;
    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }

    if (error && typeof error === 'object') {
      const nested = (error as any).message;
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim();
      }
    }

    return null;
  }

  private extractErrorMessageFromException(error: any): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const payload = this.unwrapPayload((error as any).response?.data);
    const responseMessage = this.extractErrorMessage(payload);
    if (responseMessage) {
      return responseMessage;
    }

    const message = (error as any).message;
    if (typeof message === 'string' && message.trim()) {
      const normalized = message.trim();
      if (!/^Request failed with status code \d+$/i.test(normalized)) {
        return normalized;
      }
    }

    return null;
  }

  private parseListPayload(response: any): any[] | null {
    const payload = this.unwrapPayload(response);

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const candidates = [
      payload.projects,
      payload.items,
      payload.life,
      payload.topics,
      payload.scopes,
      payload.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private normalizeLibraryProject(
    raw: any,
    scopeRoot: 'projects' | 'life',
    lifecycleDefault: string
  ): LibraryProject | null {
    if (typeof raw === 'string') {
      const slug = this.slugify(raw);
      if (!slug) return null;
      const normalizedPath = scopeRoot === 'life'
        ? `life/${slug}`
        : `projects/active/${slug}`;
      return {
        name: String(raw).trim() || slug,
        slug,
        lifecycle: lifecycleDefault,
        path: normalizedPath,
        scope_root: scopeRoot,
        has_agent_md: false,
        has_spec: false,
        has_build_plan: false,
        has_decisions: false,
      };
    }

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const candidatePath = this.normalizePath(raw.path || raw.scope_path || '');
    const candidateSlug = this.slugify(raw.slug || raw.topic || raw.name || (candidatePath ? candidatePath.split('/').pop() : ''));
    if (!candidateSlug) {
      return null;
    }

    let normalizedPath = candidatePath;
    if (!normalizedPath) {
      normalizedPath = scopeRoot === 'life'
        ? `life/${candidateSlug}`
        : `projects/active/${candidateSlug}`;
    }

    if (scopeRoot === 'life' && !normalizedPath.startsWith('life/')) {
      normalizedPath = `life/${candidateSlug}`;
    }

    if (scopeRoot === 'projects' && !normalizedPath.startsWith('projects/')) {
      normalizedPath = `projects/active/${candidateSlug}`;
    }

    const name = String(raw.name || raw.topic || candidateSlug).trim() || candidateSlug;

    return {
      name,
      slug: candidateSlug,
      lifecycle: String(raw.lifecycle || lifecycleDefault || 'active'),
      path: normalizedPath,
      scope_root: scopeRoot,
      has_agent_md: Boolean(raw.has_agent_md),
      has_spec: Boolean(raw.has_spec),
      has_build_plan: Boolean(raw.has_build_plan),
      has_decisions: Boolean(raw.has_decisions),
    };
  }

  private normalizeLibraryProjects(
    values: any[],
    scopeRoot: 'projects' | 'life',
    lifecycleDefault: string
  ): LibraryProject[] {
    return values
      .map((entry) => this.normalizeLibraryProject(entry, scopeRoot, lifecycleDefault))
      .filter((entry): entry is LibraryProject => Boolean(entry));
  }

  async fetchProjects(lifecycle: string = 'active'): Promise<LibraryProject[]> {
    const api = this.ensureApi();
    const response: ApiResponse = await api.get(
      `/api/v1/plugin-api/braindrive-library/library/projects?lifecycle=${encodeURIComponent(lifecycle)}`
    );
    const values = this.parseListPayload(response);
    if (values) {
      return this.normalizeLibraryProjects(values, 'projects', lifecycle);
    }
    throw new Error('Failed to fetch library projects');
  }

  async fetchLifeScopes(): Promise<LibraryProject[]> {
    const api = this.ensureApi();
    const endpoints = [
      '/api/v1/plugin-api/braindrive-library/library/life',
      '/api/v1/plugin-api/braindrive-library/library/projects?path=life',
      '/api/v1/plugin-api/braindrive-library/library/projects?scope=life',
    ];

    for (const endpoint of endpoints) {
      try {
        const response: ApiResponse = await api.get(endpoint);
        const values = this.parseListPayload(response);
        if (values) {
          return this.normalizeLibraryProjects(values, 'life', 'active');
        }
      } catch (_error) {
        // Try next endpoint candidate.
      }
    }

    return [];
  }

  async fetchProjectContext(slug: string, lifecycle: string = 'active'): Promise<LibraryProjectContext> {
    const api = this.ensureApi();
    const response: ApiResponse = await api.get(
      `/api/v1/plugin-api/braindrive-library/library/project/${encodeURIComponent(slug)}/context?lifecycle=${encodeURIComponent(lifecycle)}`
    );
    if (response?.data?.success) {
      return response.data;
    }
    if (response?.success) {
      return response as any;
    }
    throw new Error('Failed to fetch project context');
  }

  async fetchScopeStatus(scopePath: string): Promise<LibraryScopeStatus> {
    const api = this.ensureApi();
    const response: ApiResponse = await api.get(
      `/api/v1/plugin-api/braindrive-library/library/scope/status?scope=${encodeURIComponent(scopePath)}`
    );

    if (response?.data?.success) {
      return response.data as LibraryScopeStatus;
    }
    if (response?.success) {
      return response as unknown as LibraryScopeStatus;
    }
    throw new Error('Failed to fetch library scope status');
  }

  async ensureProject(input: LibraryProjectProvisionInput): Promise<LibraryProjectProvisionResult> {
    const api = this.ensureApi();

    const lifecycle = this.slugify(String(input.lifecycle || 'active')) || 'active';
    const requestedPath = this.normalizePath(String(input.path || ''));
    const requestedName = String(input.name || '').trim();
    let requestedSlug = this.slugify(String(input.slug || ''));

    if (!requestedPath && !requestedSlug) {
      requestedSlug = this.slugify(requestedName);
    }

    if (!requestedPath && !requestedSlug) {
      throw new Error('Project slug or name is required');
    }

    const payload: Record<string, any> = {
      lifecycle,
    };

    if (requestedPath) {
      payload.path = requestedPath;
    } else {
      payload.slug = requestedSlug;
      if (requestedName) {
        payload.name = requestedName;
      }
    }

    const endpoints = [
      '/api/v1/plugin-api/braindrive-library/library/projects',
      '/api/v1/plugin-api/BrainDriveLibraryPlugin/library/projects',
      '/api/v1/plugin-api/BrainDriveLibraryService/library/projects',
    ];

    let lastError: unknown = null;
    let extractedErrorMessage: string | null = null;

    for (const endpoint of endpoints) {
      try {
        const response: ApiResponse = await api.post(endpoint, payload);
        const normalized = this.unwrapPayload(response);

        if (!normalized?.success) {
          throw new Error(this.extractErrorMessage(normalized) || 'Failed to create library project');
        }

        const returnedPath = this.normalizePath(String(normalized.path || requestedPath || ''));
        const fallbackSlug = requestedSlug || this.slugify(returnedPath.split('/').pop() || '');
        const returnedSlug = this.slugify(String(normalized.slug || fallbackSlug));
        if (!returnedSlug) {
          throw new Error('Library project response is missing a valid slug');
        }

        const createdFlag = typeof normalized.created === 'boolean'
          ? normalized.created
          : undefined;
        const existingFlag = typeof normalized.existing === 'boolean'
          ? normalized.existing
          : undefined;

        const created = createdFlag !== undefined ? createdFlag : existingFlag !== true;
        const existing = existingFlag !== undefined ? existingFlag : !created;

        const returnedLifecycle = String(normalized.lifecycle || lifecycle || 'active');
        const project = this.normalizeLibraryProject(normalized.project, 'projects', returnedLifecycle);

        return {
          success: true,
          created,
          existing,
          path: returnedPath || `projects/${returnedLifecycle}/${returnedSlug}`,
          slug: returnedSlug,
          lifecycle: returnedLifecycle,
          project,
        };
      } catch (error) {
        lastError = error;
        extractedErrorMessage = this.extractErrorMessageFromException(error) || extractedErrorMessage;
      }
    }

    if (extractedErrorMessage) {
      throw new Error(extractedErrorMessage);
    }

    if (lastError && typeof lastError === 'object') {
      const maybeMessage = (lastError as any).message || (lastError as any).detail;
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        throw new Error(maybeMessage.trim());
      }
    }

    throw new Error('Failed to create library project');
  }
}
