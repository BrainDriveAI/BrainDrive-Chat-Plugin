// Chat message types
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// Model information
export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
}

// Conversation information
export interface ConversationInfo {
  id: string;
  title?: string;
  user_id: string;
  model?: string;
  server?: string;
  conversation_type: string;
  created_at: string;
  updated_at?: string;
}

// Dropdown option for conversations
export interface ConversationDropdownOption {
  id: string;
  primaryText: string;
  secondaryText: string;
  metadata?: {
    model?: string;
    server?: string;
    created_at: string;
    updated_at?: string;
  };
}

// API Response interface
export interface ApiResponse {
  data?: any;
  status?: number;
  id?: string;
  [key: string]: any;
}

// Service interfaces
export interface ApiService {
  get: (url: string, options?: any) => Promise<ApiResponse>;
  post: (url: string, data: any, options?: any) => Promise<ApiResponse>;
  put: (url: string, data: any, options?: any) => Promise<ApiResponse>;
  delete: (url: string, options?: any) => Promise<ApiResponse>;
  postStreaming?: (url: string, data: any, onChunk: (chunk: string) => void, options?: any) => Promise<ApiResponse>;
}

export interface EventService {
  sendMessage: (target: string, message: any, options?: any) => void;
  subscribeToMessages: (target: string, callback: (message: any) => void) => void;
  unsubscribeFromMessages: (target: string, callback: (message: any) => void) => void;
}

export interface ThemeService {
  getCurrentTheme: () => string;
  addThemeChangeListener: (callback: (theme: string) => void) => void;
  removeThemeChangeListener: (callback: (theme: string) => void) => void;
}

export interface SettingsService {
  get: (key: string) => any;
  set: (key: string, value: any) => Promise<void>;
  getSetting?: (id: string) => Promise<any>;
  setSetting?: (id: string, value: any) => Promise<any>;
  getSettingDefinitions?: () => Promise<any>;
}

export interface Services {
  api?: ApiService;
  event?: EventService;
  theme?: ThemeService;
  settings?: SettingsService;
}

// Component props
export interface BrainDriveChatProps {
  moduleId?: string;
  services: Services;
  initialGreeting?: string;
  defaultStreamingMode?: boolean;
  promptQuestion?: string;
  conversationType?: string;
}

// Component state
export interface BrainDriveChatState {
  messages: ChatMessage[];
  inputText: string;
  isLoading: boolean;
  error: string;
  currentTheme: string;
  selectedModel: ModelInfo | null;
  useStreaming: boolean;
  conversation_id: string | null;
  isLoadingHistory: boolean;
  currentUserId: string | null;
  isInitializing: boolean;
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  isUpdating: boolean;
  models: ModelInfo[];
  isLoadingModels: boolean;
  showModelSelection: boolean;
  showConversationHistory: boolean;
}

// Provider settings
export interface ServerInfo {
  id: string;
  serverName: string;
  serverAddress: string;
  apiKey?: string;
}

export interface ProviderSettings {
  id: string;
  name: string;
  servers: ServerInfo[];
}