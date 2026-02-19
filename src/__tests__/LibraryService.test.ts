import { LibraryService } from '../services/libraryService';
import { ApiService } from '../types';

const mockApi = (): ApiService => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

describe('LibraryService', () => {
  test('fetchProjects calls correct API endpoint', async () => {
    const api = mockApi();
    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, projects: [{ slug: 'alpha', name: 'Alpha' }], count: 1 },
    });
    const service = new LibraryService(api);
    const projects = await service.fetchProjects('active');
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/plugin-api/braindrive-library/library/projects?lifecycle=active'
    );
    expect(projects).toHaveLength(1);
    expect(projects[0].slug).toBe('alpha');
  });

  test('fetchProjectContext calls correct API with slug', async () => {
    const api = mockApi();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        project: 'alpha',
        lifecycle: 'active',
        files: { 'AGENT.md': { content: '# Alpha', size: 7 } },
      },
    });
    const service = new LibraryService(api);
    const ctx = await service.fetchProjectContext('alpha', 'active');
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/plugin-api/braindrive-library/library/project/alpha/context?lifecycle=active'
    );
    expect(ctx.files['AGENT.md']).toBeDefined();
  });

  test('fetchLifeScopes calls life endpoint and normalizes scope root', async () => {
    const api = mockApi();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        life: [{ slug: 'finances', name: 'Finances', path: 'life/finances' }],
      },
    });

    const service = new LibraryService(api);
    const scopes = await service.fetchLifeScopes();

    expect(api.get).toHaveBeenCalledWith('/api/v1/plugin-api/braindrive-library/library/life');
    expect(scopes).toHaveLength(1);
    expect(scopes[0].scope_root).toBe('life');
    expect(scopes[0].path).toBe('life/finances');
  });

  test('fetchLifeScopes falls back to projects path endpoint', async () => {
    const api = mockApi();
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({
        data: {
          success: true,
          projects: [{ slug: 'fitness', name: 'Fitness', path: 'life/fitness' }],
        },
      });

    const service = new LibraryService(api);
    const scopes = await service.fetchLifeScopes();

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/v1/plugin-api/braindrive-library/library/life');
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/v1/plugin-api/braindrive-library/library/projects?path=life');
    expect(scopes).toHaveLength(1);
    expect(scopes[0].slug).toBe('fitness');
    expect(scopes[0].scope_root).toBe('life');
  });

  test('ensureProject posts to create endpoint and maps response', async () => {
    const api = mockApi();
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        created: true,
        existing: false,
        path: 'projects/active/finance-chat',
        slug: 'finance-chat',
        lifecycle: 'active',
        project: {
          slug: 'finance-chat',
          name: 'Finance Chat',
          lifecycle: 'active',
          path: 'projects/active/finance-chat',
          has_agent_md: true,
          has_spec: true,
          has_build_plan: true,
          has_decisions: true,
        },
      },
    });

    const service = new LibraryService(api);
    const result = await service.ensureProject({
      slug: 'finance-chat',
      name: 'Finance Chat',
      lifecycle: 'active',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/plugin-api/braindrive-library/library/projects',
      {
        lifecycle: 'active',
        slug: 'finance-chat',
        name: 'Finance Chat',
      }
    );
    expect(result.created).toBe(true);
    expect(result.existing).toBe(false);
    expect(result.slug).toBe('finance-chat');
    expect(result.path).toBe('projects/active/finance-chat');
    expect(result.project?.name).toBe('Finance Chat');
  });

  test('ensureProject falls back to canonical plugin slug endpoint', async () => {
    const api = mockApi();
    (api.post as jest.Mock)
      .mockRejectedValueOnce(new Error('Request failed with status code 404'))
      .mockResolvedValueOnce({
        data: {
          success: true,
          created: false,
          existing: true,
          path: 'projects/active/alpha',
          slug: 'alpha',
          lifecycle: 'active',
        },
      });

    const service = new LibraryService(api);
    const result = await service.ensureProject({ slug: 'alpha', lifecycle: 'active' });

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/plugin-api/braindrive-library/library/projects',
      {
        lifecycle: 'active',
        slug: 'alpha',
      }
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/plugin-api/BrainDriveLibraryPlugin/library/projects',
      {
        lifecycle: 'active',
        slug: 'alpha',
      }
    );
    expect(result.created).toBe(false);
    expect(result.existing).toBe(true);
    expect(result.slug).toBe('alpha');
  });

  test('fetchProjects throws on API failure', async () => {
    const api = mockApi();
    (api.get as jest.Mock).mockResolvedValue({ status: 500 });
    const service = new LibraryService(api);
    await expect(service.fetchProjects('active')).rejects.toThrow('Failed to fetch library projects');
  });

  test('fetchProjectContext throws on API failure', async () => {
    const api = mockApi();
    (api.get as jest.Mock).mockResolvedValue({ status: 500 });
    const service = new LibraryService(api);
    await expect(service.fetchProjectContext('alpha')).rejects.toThrow('Failed to fetch project context');
  });

  test('throws if no API service', async () => {
    const service = new LibraryService(undefined);
    await expect(service.fetchProjects('active')).rejects.toThrow('API service not available');
  });
});
