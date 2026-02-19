import { ApiResponse, ApiService } from '../types';

export interface LibraryPageCreateValues {
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

export interface LibraryPageCreateContext {
  pageId: string | null;
  pluginInstanceId?: string | null;
  moduleId?: string | null;
}

export interface LibraryPageCreateResult {
  pageId: string;
  route: string;
  isRouteAdjusted: boolean;
  payload: Record<string, any>;
  page: Record<string, any>;
}

type PageContent = {
  layouts: Record<string, any[]>;
  modules: Record<string, any>;
};

type ChatModuleBlueprint = {
  sourceModuleUniqueId: string;
  moduleDefinition: Record<string, any>;
  layoutItemsByDevice: Record<string, any>;
};

export class LibraryPageService {
  private api: ApiService | undefined;

  constructor(api?: ApiService) {
    this.api = api;
  }

  async createLibraryPage(
    values: LibraryPageCreateValues,
    context: LibraryPageCreateContext
  ): Promise<LibraryPageCreateResult> {
    if (!this.api) {
      throw new Error('API service not available');
    }

    const pageName = (values.pageName || '').trim();
    if (!pageName) {
      throw new Error('Page name is required');
    }

    const blueprint = await this.resolveChatModuleBlueprint(context);

    const initialRoute = this.buildRouteSlug(values.routeSlug, pageName);
    let routeToUse = initialRoute;
    let isRouteAdjusted = false;

    let payload = this.buildCreatePayload(values, routeToUse, blueprint);

    let createdPageResponse: ApiResponse;
    try {
      createdPageResponse = await this.api.post('/api/v1/pages', payload);
    } catch (error) {
      if (!this.isRouteCollisionError(error)) {
        throw error;
      }

      routeToUse = `${initialRoute}-${Math.floor(Date.now() / 1000)}`;
      payload = this.buildCreatePayload(values, routeToUse, blueprint);
      createdPageResponse = await this.api.post('/api/v1/pages', payload);
      isRouteAdjusted = true;
    }

    const createdPage = this.extractPageRecord(createdPageResponse);

    return {
      pageId: String(createdPage.id),
      route: String(createdPage.route || routeToUse),
      isRouteAdjusted,
      payload,
      page: createdPage,
    };
  }

  async publishPage(pageId: string, publish: boolean = true): Promise<Record<string, any>> {
    if (!this.api) {
      throw new Error('API service not available');
    }

    const normalizedPageId = this.normalizeUuid(pageId || '');
    if (!normalizedPageId) {
      throw new Error('Invalid page ID');
    }

    const response = await this.api.post(`/api/v1/pages/${normalizedPageId}/publish`, { publish });
    return this.extractPageRecord(response);
  }

  private normalizeUuid(id: string): string {
    return id.replace(/-/g, '');
  }

  private slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private buildRouteSlug(routeSlug: string, pageName: string): string {
    const preferred = this.slugify(routeSlug || '');
    if (preferred) {
      return preferred;
    }

    const fromName = this.slugify(pageName || '');
    if (fromName) {
      return fromName;
    }

    return `library-chat-${Math.floor(Date.now() / 1000)}`;
  }

  private resolveDefaultProjectSlug(values: LibraryPageCreateValues, route: string): string | null {
    const configured = this.slugify(values.defaultProjectSlug || '');
    if (configured) {
      return configured;
    }

    const fromRoute = this.slugify(route || values.routeSlug || '');
    if (fromRoute) {
      return fromRoute;
    }

    const fromName = this.slugify(values.pageName || '');
    return fromName || null;
  }

  private buildLibraryChatConfig(values: LibraryPageCreateValues, route: string): Record<string, any> {
    const defaultLibraryScopeEnabled = Boolean(values.defaultLibraryScopeEnabled);
    const defaultProjectLifecycle = (values.defaultProjectLifecycle || '').trim() || 'active';
    const defaultProjectSlug = defaultLibraryScopeEnabled
      ? this.resolveDefaultProjectSlug(values, route)
      : null;
    const defaultScopePath = defaultProjectSlug
      ? 'projects/' + defaultProjectLifecycle + '/' + defaultProjectSlug
      : null;

    return {
      conversation_type: (values.conversationType || '').trim() || 'chat',
      default_library_scope_enabled: defaultLibraryScopeEnabled,
      default_project_slug: defaultProjectSlug,
      default_project_lifecycle: defaultProjectLifecycle,
      default_scope_root: defaultProjectSlug ? 'projects' : null,
      default_scope_path: defaultScopePath,
      default_persona_id: values.defaultPersonaId || null,
      default_model_key: values.defaultModelKey || null,
      apply_defaults_on_new_chat: values.applyDefaultsOnNewChat !== false,
      lock_project_scope: Boolean(values.lockProjectScope),
      lock_persona_selection: Boolean(values.lockPersonaSelection),
      lock_model_selection: Boolean(values.lockModelSelection),
    };
  }

  private buildCreatePayload(
    values: LibraryPageCreateValues,
    route: string,
    blueprint: ChatModuleBlueprint
  ): Record<string, any> {
    const newModuleUniqueId = this.generateModuleUniqueId(blueprint.moduleDefinition);
    const libraryConfig = this.buildLibraryChatConfig(values, route);

    const moduleDefinition = this.deepClone(blueprint.moduleDefinition);
    moduleDefinition.config = {
      ...(moduleDefinition.config || {}),
      ...libraryConfig,
    };

    const layouts: Record<string, any[]> = {};
    const sourceDevices = Object.keys(blueprint.layoutItemsByDevice);
    const allDevices = Array.from(new Set([...sourceDevices, 'desktop', 'tablet', 'mobile']));

    for (const device of allDevices) {
      const templateLayoutItem = blueprint.layoutItemsByDevice[device]
        || blueprint.layoutItemsByDevice.desktop
        || this.buildFallbackLayoutItem(blueprint.sourceModuleUniqueId);
      layouts[device] = [this.retargetLayoutItem(templateLayoutItem, newModuleUniqueId)];
    }

    return {
      name: values.pageName.trim(),
      route,
      description: 'Library BrainDrive Chat page created from Library menu',
      content: {
        layouts,
        modules: {
          [newModuleUniqueId]: moduleDefinition,
        },
      },
    };
  }

  private buildFallbackLayoutItem(moduleUniqueId: string): Record<string, any> {
    return {
      moduleUniqueId,
      i: moduleUniqueId,
      x: 0,
      y: 0,
      w: 8,
      h: 8,
      minW: 4,
      minH: 4,
    };
  }

  private generateModuleUniqueId(moduleDefinition: Record<string, any>): string {
    const sanitizeToken = (value: unknown, fallback: string): string => {
      const token = String(value || '')
        .trim()
        .replace(/[^A-Za-z0-9_]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
      return token || fallback;
    };

    // Keep underscore-separated identity structure to match existing page/module parsing heuristics.
    const pluginPart = sanitizeToken(moduleDefinition.pluginId, 'Plugin');
    const modulePart = sanitizeToken(moduleDefinition.moduleId || moduleDefinition.moduleName, 'Module');
    const now = Date.now();
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${pluginPart}_${modulePart}_${now}_${rand}`;
  }

  private retargetLayoutItem(layoutItem: Record<string, any>, newModuleUniqueId: string): Record<string, any> {
    const cloned = this.deepClone(layoutItem || {});
    cloned.moduleUniqueId = newModuleUniqueId;
    cloned.i = newModuleUniqueId;
    return cloned;
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private parsePageContent(rawContent: any): PageContent {
    const parsedContent = typeof rawContent === 'string'
      ? JSON.parse(rawContent)
      : rawContent;

    if (!parsedContent || typeof parsedContent !== 'object') {
      throw new Error('Current page content is not a valid object');
    }

    const rawLayouts = parsedContent.layouts && typeof parsedContent.layouts === 'object'
      ? parsedContent.layouts
      : {};
    const rawModules = parsedContent.modules && typeof parsedContent.modules === 'object'
      ? parsedContent.modules
      : {};

    return {
      layouts: rawLayouts,
      modules: rawModules,
    };
  }

  private extractPageRecord(response: ApiResponse): Record<string, any> {
    const candidate = (response as any)?.page
      || (response as any)?.data?.page
      || (response as any)?.data
      || response;

    if (!candidate || typeof candidate !== 'object') {
      throw new Error('Unexpected page API response format');
    }

    return candidate as Record<string, any>;
  }

  private normalizeText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().toLowerCase();
  }

  private scoreModuleCandidate(
    moduleUniqueId: string,
    moduleDef: Record<string, any>,
    context: LibraryPageCreateContext
  ): number {
    const moduleId = this.normalizeText(moduleDef.moduleId);
    const moduleName = this.normalizeText(moduleDef.moduleName);
    const pluginId = this.normalizeText(moduleDef.pluginId);
    const key = this.normalizeText(moduleUniqueId);

    const hintedPluginId = this.normalizeText(context.pluginInstanceId || '');
    const hintedModuleId = this.normalizeText(context.moduleId || '');

    let score = 0;

    if (hintedPluginId && pluginId === hintedPluginId) {
      score += 10;
    }

    if (hintedModuleId && moduleId === hintedModuleId) {
      score += 8;
    }

    if (hintedModuleId && moduleName === hintedModuleId) {
      score += 6;
    }

    if (moduleId.includes('chat') || moduleName.includes('chat') || key.includes('chat')) {
      score += 4;
    }

    if (moduleId.includes('braindrive') || moduleName.includes('braindrive')) {
      score += 2;
    }

    return score;
  }

  private resolveBestModule(
    content: PageContent,
    context: LibraryPageCreateContext
  ): { moduleUniqueId: string; moduleDefinition: Record<string, any> } {
    const entries = Object.entries(content.modules || {});
    if (!entries.length) {
      throw new Error('Current page has no modules to clone for Library page creation');
    }

    let best: { moduleUniqueId: string; moduleDefinition: Record<string, any>; score: number } | null = null;

    for (const [moduleUniqueId, moduleDefinition] of entries) {
      const moduleDef = (moduleDefinition || {}) as Record<string, any>;
      const score = this.scoreModuleCandidate(moduleUniqueId, moduleDef, context);
      if (!best || score > best.score) {
        best = { moduleUniqueId, moduleDefinition: moduleDef, score };
      }
    }

    if (!best) {
      throw new Error('Unable to resolve a chat module blueprint from current page');
    }

    if (best.score <= 0) {
      if (entries.length === 1) {
        const [moduleUniqueId, moduleDefinition] = entries[0];
        return { moduleUniqueId, moduleDefinition: moduleDefinition as Record<string, any> };
      }
      throw new Error('Unable to resolve chat module blueprint; open this flow from a page containing BrainDrive Chat');
    }

    return {
      moduleUniqueId: best.moduleUniqueId,
      moduleDefinition: best.moduleDefinition,
    };
  }

  private resolveLayoutItemsByDevice(content: PageContent, moduleUniqueId: string): Record<string, any> {
    const layouts = content.layouts || {};
    const result: Record<string, any> = {};

    for (const [device, rawItems] of Object.entries(layouts)) {
      const items = Array.isArray(rawItems) ? rawItems : [];
      const matched = items.find((item: any) => {
        if (!item || typeof item !== 'object') return false;
        return item.moduleUniqueId === moduleUniqueId || item.i === moduleUniqueId;
      });

      if (matched) {
        result[device] = matched;
      }
    }

    if (!result.desktop) {
      const first = Object.values(result)[0] as Record<string, any> | undefined;
      if (first) {
        result.desktop = first;
      }
    }

    if (!result.desktop) {
      result.desktop = this.buildFallbackLayoutItem(moduleUniqueId);
    }

    return result;
  }

  private async resolveChatModuleBlueprint(context: LibraryPageCreateContext): Promise<ChatModuleBlueprint> {
    if (!this.api) {
      throw new Error('API service not available');
    }

    if (!context.pageId) {
      throw new Error('Current page context is unavailable; cannot clone chat module blueprint');
    }

    const normalizedPageId = this.normalizeUuid(context.pageId);
    const pageResponse = await this.api.get(`/api/v1/pages/${normalizedPageId}`);
    const pageRecord = this.extractPageRecord(pageResponse);
    const content = this.parsePageContent(pageRecord.content);

    const resolvedModule = this.resolveBestModule(content, context);
    const layoutItemsByDevice = this.resolveLayoutItemsByDevice(content, resolvedModule.moduleUniqueId);

    return {
      sourceModuleUniqueId: resolvedModule.moduleUniqueId,
      moduleDefinition: this.deepClone(resolvedModule.moduleDefinition),
      layoutItemsByDevice,
    };
  }

  private isRouteCollisionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const raw = error as any;
    const message = String(raw?.message || '').toLowerCase();
    const detail = String(raw?.response?.data?.detail || raw?.detail || '').toLowerCase();
    const status = Number(raw?.status || raw?.response?.status || 0);

    if (status !== 400) {
      return false;
    }

    return (
      (message.includes('route') && message.includes('exist'))
      || (detail.includes('route') && detail.includes('exist'))
    );
  }
}
