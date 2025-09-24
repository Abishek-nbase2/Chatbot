import { GoogleGenAI } from "@google/genai";
export class GeminiService {
    ai;
    model;
    constructor(apiKey = 'AIzaSyB9iryBtvT-_EfggSBNljrZyuzKfPpd20Q', model = 'gemini-2.0-flash-exp') {
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
    }
    async generateResponse(prompt, systemPrompt) {
        try {
            let contents = '';
            if (systemPrompt) {
                contents = `${systemPrompt}\n\nUser: ${prompt}`;
            }
            else {
                contents = prompt;
            }
            console.log('Sending request to Gemini:', {
                model: this.model,
                contents
            });
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: contents,
            });
            console.log('Gemini response received');
            const responseText = response.text;
            if (responseText) {
                return responseText;
            }
            else {
                console.error('No text in Gemini response:', response);
                return 'No response generated from Gemini';
            }
        }
        catch (error) {
            console.error('Error generating response from Gemini:', error);
            throw new Error(`Failed to generate response from Gemini: ${error.message || 'Unknown error'}`);
        }
    }
    setModel(model) {
        this.model = model;
    }
    getModel() {
        return this.model;
    }
}
