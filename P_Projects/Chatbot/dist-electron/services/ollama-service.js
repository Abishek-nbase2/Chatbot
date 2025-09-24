import axios from 'axios';
export class OllamaService {
    baseUrl;
    model;
    constructor(baseUrl = 'http://localhost:11434', model = 'llama3') {
        this.baseUrl = baseUrl;
        this.model = model;
    }
    async checkConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 5000
            });
            return response.status === 200;
        }
        catch (error) {
            console.error('Ollama connection check failed:', error);
            return false;
        }
    }
    async listModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            return response.data.models?.map((model) => model.name) || [];
        }
        catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }
    async pullModel(modelName) {
        try {
            await axios.post(`${this.baseUrl}/api/pull`, {
                name: modelName
            });
            return true;
        }
        catch (error) {
            console.error('Failed to pull model:', error);
            return false;
        }
    }
    async generateResponse(prompt, systemPrompt) {
        try {
            const messages = [];
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
                timeout: 120000, // Increased to 2 minutes
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Ollama response:', response.data);
            // Extract content from the response
            if (response.data && response.data.message && response.data.message.content) {
                return response.data.message.content;
            }
            else {
                console.error('Unexpected response format:', response.data);
                return 'No response generated - unexpected format';
            }
        }
        catch (error) {
            console.error('Error generating response:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            throw new Error(`Failed to generate response from Ollama: ${error.message || 'Unknown error'}`);
        }
    }
    async generateEmbedding(text) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
                model: 'nomic-embed-text', // Using a dedicated embedding model
                prompt: text
            }, {
                timeout: 60000 // Increased to 1 minute
            });
            return response.data.embedding || [];
        }
        catch (error) {
            console.error('Error generating embedding:', error);
            // Fallback: return empty array or use alternative embedding
            return [];
        }
    }
    setModel(model) {
        this.model = model;
    }
    getModel() {
        return this.model;
    }
}
