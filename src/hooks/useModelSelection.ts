import { useState, useCallback } from 'react';
import { ModelInfo, ProviderSettings, Services } from '../types';

export const useModelSelection = (services?: Services) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  /**
   * Load provider settings and models
   */
  const loadProviderSettings = useCallback(async () => {
    setIsLoadingModels(true);
    
    if (!services?.api) {
      setIsLoadingModels(false);
      return;
    }
    
    try {
      // Get provider settings from configuration or use default
      const providerSettingIds = ['ollama_servers_settings'];
      const loadedModels: ModelInfo[] = [];
      
      // Load each provider setting
      for (const settingId of providerSettingIds) {
        try {
          const response = await services.api.get('/api/v1/settings/instances', {
            params: {
              definition_id: settingId,
              scope: 'user',
              user_id: 'current'
            }
          });
          
          // Process response to extract settings data
          let settingsData = null;
          
          if (Array.isArray(response) && response.length > 0) {
            settingsData = response[0];
          } else if (response && typeof response === 'object') {
            const responseObj = response as Record<string, any>;
            
            if (responseObj.data) {
              if (Array.isArray(responseObj.data) && responseObj.data.length > 0) {
                settingsData = responseObj.data[0];
              } else if (typeof responseObj.data === 'object') {
                settingsData = responseObj.data;
              }
            } else {
              settingsData = response;
            }
          }
          
          if (settingsData && settingsData.value) {
            // Parse the value field
            let parsedValue = typeof settingsData.value === 'string' 
              ? JSON.parse(settingsData.value) 
              : settingsData.value;
            
            const providerSetting: ProviderSettings = {
              id: settingId,
              name: settingsData.name || settingId,
              servers: Array.isArray(parsedValue.servers) ? parsedValue.servers : []
            };
            
            // Load models for each server
            for (const server of providerSetting.servers) {
              try {
                const encodedUrl = encodeURIComponent(server.serverAddress);
                const params: Record<string, string> = { 
                  server_url: encodedUrl,
                  settings_id: providerSetting.id,
                  server_id: server.id
                };
                
                if (server.apiKey) {
                  params.api_key = server.apiKey;
                }
                
                const modelResponse = await services.api.get('/api/v1/ollama/models', { params });
                const serverModels = Array.isArray(modelResponse) ? modelResponse : [];
                
                // Map server models to ModelInfo format
                for (const model of serverModels) {
                  loadedModels.push({
                    name: model.name,
                    provider: 'ollama',
                    providerId: providerSetting.id,
                    serverName: server.serverName,
                    serverId: server.id
                  });
                }
              } catch (error) {
                console.error(`Error loading models for server ${server.serverName}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading provider setting ${settingId}:`, error);
        }
      }
      
      // Update state with models
      setModels(loadedModels);
      setSelectedModel(loadedModels.length > 0 ? loadedModels[0] : null);
      setIsLoadingModels(false);
      
      return loadedModels;
    } catch (error: any) {
      console.error("Error loading provider settings:", error);
      setIsLoadingModels(false);
      return [];
    }
  }, [services?.api]);

  /**
   * Handle model selection change
   */
  const handleModelChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    const model = models.find(m => 
      `${m.provider}_${m.serverId}_${m.name}` === modelId
    );
    
    if (model) {
      setSelectedModel(model);
      return model;
    }
    return null;
  }, [models]);

  /**
   * Broadcast model selection event
   */
  const broadcastModelSelection = useCallback((model: ModelInfo) => {
    if (!services?.event) {
      return;
    }
    
    // Create model selection message
    const modelInfo = {
      type: 'model.selection',
      content: {
        model: {
          name: model.name,
          provider: model.provider,
          providerId: model.providerId,
          serverName: model.serverName,
          serverId: model.serverId
        },
        timestamp: new Date().toISOString()
      }
    };
    
    // Send to event system
    services.event.sendMessage('ai-prompt-chat', modelInfo.content);
  }, [services?.event]);

  return {
    models,
    selectedModel,
    isLoadingModels,
    loadProviderSettings,
    handleModelChange,
    broadcastModelSelection,
    setSelectedModel
  };
};