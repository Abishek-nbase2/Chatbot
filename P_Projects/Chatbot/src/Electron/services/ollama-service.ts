import axios from 'axios';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Ollama connection check failed:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName
      });
      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: OllamaMessage[] = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      console.log('Sending request to Ollama:', {
        model: this.model,
        messages: messages,
        stream: false
      });

      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages: messages,
        stream: false
      }, {
        timeout: 120000,  // Increased to 2 minutes
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Ollama response:', response.data);

      // Extract content from the response
      if (response.data && response.data.message && response.data.message.content) {
        return response.data.message.content;
      } else {
        console.error('Unexpected response format:', response.data);
        return 'No response generated - unexpected format';
      }
    } catch (error: any) {
      console.error('Error generating response:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to generate response from Ollama: ${error.message || 'Unknown error'}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: 'nomic-embed-text', // Using a dedicated embedding model
        prompt: text
      }, {
        timeout: 60000  // Increased to 1 minute
      });

      return response.data.embedding || [];
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback: return empty array or use alternative embedding
      return [];
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }
}