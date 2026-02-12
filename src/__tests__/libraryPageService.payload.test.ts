import { LibraryPageService, LibraryPageCreateValues } from '../services/libraryPageService';

type PostCall = { url: string; data: any };

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${String(expected)}. Received: ${String(actual)}`);
  }
}

function assertNotEqual(actual: unknown, unexpected: unknown, message: string) {
  if (actual === unexpected) {
    throw new Error(`${message}. Value should not equal: ${String(unexpected)}`);
  }
}

function assertTruthy(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

class MockApi {
  public readonly getCalls: string[] = [];
  public readonly postCalls: PostCall[] = [];
  private createAttemptCount = 0;

  constructor(private readonly failFirstCreate: boolean = false) {}

  async get(url: string): Promise<any> {
    this.getCalls.push(url);

    if (url.startsWith('/api/v1/pages/')) {
      return {
        id: 'source-page',
        route: 'source-route',
        content: {
          layouts: {
            desktop: [{ moduleUniqueId: 'chat-module-1', i: 'chat-module-1', x: 0, y: 0, w: 8, h: 8, minW: 4, minH: 4 }],
            tablet: [{ moduleUniqueId: 'chat-module-1', i: 'chat-module-1', x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 4 }],
            mobile: [{ moduleUniqueId: 'chat-module-1', i: 'chat-module-1', x: 0, y: 0, w: 4, h: 8, minW: 4, minH: 4 }],
          },
          modules: {
            'chat-module-1': {
              pluginId: 'plugin-123',
              moduleId: 'BrainDriveChat',
              moduleName: 'BrainDriveChat',
              config: {
                existingFlag: true,
              },
            },
            'other-module': {
              pluginId: 'plugin-abc',
              moduleId: 'OtherModule',
              moduleName: 'OtherModule',
              config: {},
            },
          },
        },
      };
    }

    throw new Error(`Unhandled GET URL: ${url}`);
  }

  async post(url: string, data: any): Promise<any> {
    this.postCalls.push({ url, data });

    if (url === '/api/v1/pages') {
      this.createAttemptCount += 1;

      if (this.failFirstCreate && this.createAttemptCount === 1) {
        const err: any = new Error('A page with this route already exists');
        err.status = 400;
        throw err;
      }

      return {
        id: 'created-page-id',
        route: data.route,
        ...data,
      };
    }

    if (url.startsWith('/api/v1/pages/') && url.endsWith('/publish')) {
      return {
        id: 'created-page-id',
        is_published: true,
      };
    }

    throw new Error(`Unhandled POST URL: ${url}`);
  }

  async put(): Promise<any> {
    return {};
  }

  async delete(): Promise<any> {
    return {};
  }
}

function buildValues(overrides: Partial<LibraryPageCreateValues> = {}): LibraryPageCreateValues {
  return {
    pageName: 'Library Finance Chat',
    routeSlug: 'library-finance-chat',
    publishImmediately: true,
    openAfterCreate: false,
    conversationType: 'chat',
    defaultLibraryScopeEnabled: true,
    defaultProjectSlug: 'finance',
    defaultProjectLifecycle: 'active',
    defaultPersonaId: 'persona-1',
    defaultModelKey: 'ollama::primary-local::phi4',
    applyDefaultsOnNewChat: true,
    lockProjectScope: true,
    lockPersonaSelection: false,
    lockModelSelection: true,
    ...overrides,
  };
}

async function testPayloadMappingAndModuleClone() {
  const api = new MockApi(false);
  const service = new LibraryPageService(api as any);

  const result = await service.createLibraryPage(buildValues(), {
    pageId: '123e4567-e89b-12d3-a456-426614174000',
    pluginInstanceId: 'plugin-123',
    moduleId: 'BrainDriveChat',
  });

  assertEqual(api.getCalls[0], '/api/v1/pages/123e4567e89b12d3a456426614174000', 'page id should be normalized for fetch');
  assertEqual(api.postCalls.filter((call) => call.url === '/api/v1/pages').length, 1, 'single create call expected');

  const createPayload = api.postCalls.find((call) => call.url === '/api/v1/pages')!.data;
  assertEqual(createPayload.name, 'Library Finance Chat', 'page name should map to payload');
  assertEqual(createPayload.route, 'library-finance-chat', 'route slug should map to payload');

  const moduleEntries = Object.entries(createPayload.content.modules);
  assertEqual(moduleEntries.length, 1, 'exactly one module should be created');

  const [newModuleUniqueId, moduleDefinition] = moduleEntries[0] as [string, any];
  assertNotEqual(newModuleUniqueId, 'chat-module-1', 'module unique id should be regenerated');
  assertTruthy(newModuleUniqueId.startsWith('plugin_123_BrainDriveChat_'), 'module unique id should preserve plugin/module tokens in underscore format');
  assertEqual(moduleDefinition.pluginId, 'plugin-123', 'plugin id should be cloned');
  assertEqual(moduleDefinition.moduleId, 'BrainDriveChat', 'module id should be cloned');
  assertEqual(moduleDefinition.config.existingFlag, true, 'existing config should be preserved');

  assertEqual(moduleDefinition.config.conversation_type, 'chat', 'conversation_type should map');
  assertEqual(moduleDefinition.config.default_library_scope_enabled, true, 'default_library_scope_enabled should map');
  assertEqual(moduleDefinition.config.default_project_slug, 'finance', 'default_project_slug should map');
  assertEqual(moduleDefinition.config.default_project_lifecycle, 'active', 'default_project_lifecycle should map');
  assertEqual(moduleDefinition.config.default_persona_id, 'persona-1', 'default_persona_id should map');
  assertEqual(moduleDefinition.config.default_model_key, 'ollama::primary-local::phi4', 'default_model_key should map');
  assertEqual(moduleDefinition.config.apply_defaults_on_new_chat, true, 'apply_defaults_on_new_chat should map');
  assertEqual(moduleDefinition.config.lock_project_scope, true, 'lock_project_scope should map');
  assertEqual(moduleDefinition.config.lock_persona_selection, false, 'lock_persona_selection should map');
  assertEqual(moduleDefinition.config.lock_model_selection, true, 'lock_model_selection should map');

  assertEqual(createPayload.content.layouts.desktop[0].moduleUniqueId, newModuleUniqueId, 'desktop layout should retarget moduleUniqueId');
  assertEqual(createPayload.content.layouts.desktop[0].i, newModuleUniqueId, 'desktop layout should retarget i');

  assertEqual(result.route, 'library-finance-chat', 'result should expose route');
  assertEqual(result.isRouteAdjusted, false, 'result should indicate no route adjustment');
}

async function testRouteCollisionRetry() {
  const api = new MockApi(true);
  const service = new LibraryPageService(api as any);

  const result = await service.createLibraryPage(buildValues({ routeSlug: 'duplicate-route' }), {
    pageId: '123e4567-e89b-12d3-a456-426614174000',
    pluginInstanceId: 'plugin-123',
    moduleId: 'BrainDriveChat',
  });

  const createCalls = api.postCalls.filter((call) => call.url === '/api/v1/pages');
  assertEqual(createCalls.length, 2, 'collision should trigger one retry');
  assertEqual(createCalls[0].data.route, 'duplicate-route', 'initial route should use requested slug');
  assertNotEqual(createCalls[1].data.route, 'duplicate-route', 'retry should adjust route');
  assertTruthy(createCalls[1].data.route.startsWith('duplicate-route-'), 'retry route should include suffix');

  assertEqual(result.isRouteAdjusted, true, 'result should indicate route was adjusted');
  assertEqual(result.route, createCalls[1].data.route, 'result route should match retried payload');
}

async function run() {
  await testPayloadMappingAndModuleClone();
  await testRouteCollisionRetry();
  console.log('libraryPageService.payload.test.ts: all assertions passed');
}

run().catch((error) => {
  console.error('libraryPageService.payload.test.ts: failed', error);
  throw error;
});
