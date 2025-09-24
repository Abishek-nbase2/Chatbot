import { OllamaService } from './ollama-service.js';
import { GeminiService } from './gemini-service.js';
import type { PDFData, PDFPageData } from './pdf-processor.js';
import * as path from 'path';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    type: 'text' | 'table' | 'image';
    embedding?: number[];
    topic?: string;
    semanticType?: 'definition' | 'instruction' | 'specification' | 'example' | 'reference' | 'general';
    keyTerms?: string[];
  };
}

interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

export class RAGSystem {
  private ollama: OllamaService;
  private gemini: GeminiService;
  private documentChunks: DocumentChunk[] = [];
  private isInitialized: boolean = false;
  private vectorIndex: Map<string, number[]> = new Map();

  constructor(ollamaService: OllamaService, geminiService: GeminiService) {
    this.ollama = ollamaService;
    this.gemini = geminiService;
  }

  async buildKnowledgeBase(pdfData: PDFData): Promise<void> {
    try {
      console.log('Building RAG knowledge base...');
      
      // Clear existing data
      this.documentChunks = [];
      this.vectorIndex.clear();

      // Process text content
      await this.processTextContent(pdfData.text, pdfData.metadata);
      
      // Process page-specific content
      for (const page of pdfData.pages) {
        await this.processPageContent(page);
      }

      console.log(`Created ${this.documentChunks.length} document chunks`);
      
      // Generate embeddings for all chunks
      await this.generateEmbeddings();
      
      this.isInitialized = true;
      console.log('RAG knowledge base built successfully');
      
    } catch (error) {
      console.error('Error building knowledge base:', error);
      throw error;
    }
  }

  private async processTextContent(text: string, metadata: any): Promise<void> {
    try {
      console.log('Processing text content with semantic chunking...');
      // Use semantic chunking for the main text content
      const chunks = await this.semanticChunkText(text, 800, 'tas2781.pdf');
      
      // Add the chunks to the document collection
      for (const chunk of chunks) {
        // Merge additional metadata
        chunk.metadata = {
          ...chunk.metadata,
          ...metadata
        };
        this.documentChunks.push(chunk);
      }
      
      console.log(`Processed ${chunks.length} semantic chunks from main text`);
    } catch (error) {
      console.error('Error processing text content:', error);
      throw error;
    }
  }

  private async processPageContent(page: PDFPageData): Promise<void> {
    // Process page text with semantic chunking
    if (page.text && page.text.trim()) {
      try {
        const pageChunks = await this.semanticChunkText(
          page.text, 
          600, 
          'tas2781.pdf', 
          page.pageNumber
        );
        
        // Add the semantic chunks to the document collection
        for (const chunk of pageChunks) {
          this.documentChunks.push(chunk);
        }
        
        console.log(`Processed ${pageChunks.length} semantic chunks from page ${page.pageNumber}`);
      } catch (error) {
        console.error(`Error processing page ${page.pageNumber} content:`, error);
        // Continue processing other pages even if one fails
      }
    }

    // Process tables
    if (page.tables) {
      for (let tableIndex = 0; tableIndex < page.tables.length; tableIndex++) {
        const table = page.tables[tableIndex];
        const tableContent = this.formatTableAsText(table);
        
        const chunk: DocumentChunk = {
          id: `page_${page.pageNumber}_table_${tableIndex}`,
          content: tableContent,
          metadata: {
            source: 'tas2781.pdf',
            page: page.pageNumber,
            type: 'table'
          }
        };
        
        this.documentChunks.push(chunk);
      }
    }

    // Process images (create descriptive chunks)
    if (page.images) {
      for (let imageIndex = 0; imageIndex < page.images.length; imageIndex++) {
        const imagePath = page.images[imageIndex];
        const imageDescription = `Image on page ${page.pageNumber}, position ${imageIndex + 1}. File: ${path.basename(imagePath)}`;
        
        const chunk: DocumentChunk = {
          id: `page_${page.pageNumber}_image_${imageIndex}`,
          content: imageDescription,
          metadata: {
            source: 'tas2781.pdf',
            page: page.pageNumber,
            type: 'image'
          }
        };
        
        this.documentChunks.push(chunk);
      }
    }
  }

  private formatTableAsText(table: any): string {
    let tableText = '';
    
    if (table.caption) {
      tableText += `Table: ${table.caption}\n`;
    }
    
    if (table.headers) {
      tableText += `Headers: ${table.headers.join(' | ')}\n`;
    }
    
    if (table.rows) {
      tableText += 'Data:\n';
      for (const row of table.rows) {
        tableText += `${row.join(' | ')}\n`;
      }
    }
    
    return tableText;
  }

  private async generateEmbeddings(): Promise<void> {
    console.log('Generating embeddings for document chunks...');
    console.log(this.documentChunks);
    
    for (let i = 0; i < this.documentChunks.length; i++) {
      const chunk = this.documentChunks[i];
      
      try {
        // Try to get embedding from Ollama
        const embedding = await this.ollama.generateEmbedding(chunk.content);
        
        if (embedding && embedding.length > 0) {
          this.vectorIndex.set(chunk.id, embedding);
          chunk.metadata.embedding = embedding;
        } else {
          // Fallback: create a simple hash-based embedding
          const simpleEmbedding = this.createSimpleEmbedding(chunk.content);
          this.vectorIndex.set(chunk.id, simpleEmbedding);
          chunk.metadata.embedding = simpleEmbedding;
        }
        
        // Log progress more frequently for smaller datasets
        const logInterval = Math.max(1, Math.floor(this.documentChunks.length / 10));
        if ((i + 1) % logInterval === 0 || i === this.documentChunks.length - 1) {
          console.log(`Generated embeddings for ${i + 1}/${this.documentChunks.length} chunks`);
        }
        
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.id}:`, error);
        // Use fallback embedding
        const fallbackEmbedding = this.createSimpleEmbedding(chunk.content);
        this.vectorIndex.set(chunk.id, fallbackEmbedding);
        chunk.metadata.embedding = fallbackEmbedding;
      }
    }
    
    console.log('Embedding generation completed');
  }

  private createSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding as fallback
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Common embedding dimension
    
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        const char = word.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      const index = Math.abs(hash) % embedding.length;
      embedding[index] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  private async searchSimilarChunks(query: string, topK: number = 15): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('RAG system not initialized');
    }

    // Try to use embeddings first, fall back to simple text matching
    try {
      // Generate embedding for the query
      let queryEmbedding: number[];
      try {
        queryEmbedding = await this.ollama.generateEmbedding(query);
        if (!queryEmbedding || queryEmbedding.length === 0) {
          console.log('No embedding generated, using simple text search');
          return this.simpleTextSearch(query, topK);
        }
      } catch (error) {
        console.log('Embedding generation failed, using simple text search');
        return this.simpleTextSearch(query, topK);
      }

      // Calculate similarities using embeddings
      const similarities: SearchResult[] = [];
      
      for (const chunk of this.documentChunks) {
        const chunkEmbedding = this.vectorIndex.get(chunk.id);
        if (chunkEmbedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
          similarities.push({ chunk, similarity });
        }
      }

      // Sort by similarity and return top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      console.log("Similarities: ",similarities)
      return similarities.slice(0, topK);
      
    } catch (error) {
      console.error('Error in similarity search, falling back to text search:', error);
      return this.simpleTextSearch(query, topK);
    }
  }

  private simpleTextSearch(query: string, topK: number = 15): SearchResult[] {
    console.log('Using enhanced semantic text search for query:', query);
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const chunk of this.documentChunks) {
      const chunkText = chunk.content.toLowerCase();
      let score = 0;
      
      // Count matching words in content
      for (const word of queryWords) {
        const regex = new RegExp(word, 'gi');
        const matches = chunkText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      // Bonus for exact phrase matches
      if (chunkText.includes(query.toLowerCase())) {
        score += 10;
      }
      
      // Semantic enhancements
      if (chunk.metadata.topic) {
        const topicMatches = queryWords.filter(word => 
          chunk.metadata.topic!.toLowerCase().includes(word)
        ).length;
        score += topicMatches * 5; // Bonus for topic matches
      }
      
      // Key terms matching
      if (chunk.metadata.keyTerms) {
        const keyTermMatches = chunk.metadata.keyTerms.filter(term =>
          queryWords.some(word => term.toLowerCase().includes(word) || word.includes(term.toLowerCase()))
        ).length;
        score += keyTermMatches * 3; // Bonus for key term matches
      }
      
      // Semantic type relevance (boost certain types for certain query patterns)
      if (chunk.metadata.semanticType) {
        const queryLower = query.toLowerCase();
        if (queryLower.includes('what is') || queryLower.includes('define') || queryLower.includes('definition')) {
          if (chunk.metadata.semanticType === 'definition') score += 8;
        }
        if (queryLower.includes('how to') || queryLower.includes('procedure') || queryLower.includes('steps')) {
          if (chunk.metadata.semanticType === 'instruction') score += 8;
        }
        if (queryLower.includes('spec') || queryLower.includes('requirement') || queryLower.includes('standard')) {
          if (chunk.metadata.semanticType === 'specification') score += 8;
        }
        if (queryLower.includes('example') || queryLower.includes('sample')) {
          if (chunk.metadata.semanticType === 'example') score += 8;
        }
      }
      
      if (score > 0) {
        results.push({
          chunk,
          similarity: Math.min(score / 100, 1.0) // Normalize score with cap at 1.0
        });
      }
    }

    // Sort by score and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async chat(userMessage: string): Promise<string> {
    try {
      if (!this.isInitialized) {
        return "I'm still processing the documentation. Please wait a moment and try again.";
      }

      // Search for relevant chunks
      const searchResults = await this.searchSimilarChunks(userMessage, 15);
      
      // Build enhanced context from search results with semantic information
      let context = '';
      if (searchResults.length > 0) {
        context = searchResults
          .map((result, index) => {
            const chunk = result.chunk;
            const pageInfo = chunk.metadata.page ? ` (Page ${chunk.metadata.page})` : '';
            const topicInfo = chunk.metadata.topic ? `\nTopic: ${chunk.metadata.topic}` : '';
            const typeInfo = chunk.metadata.semanticType ? `\nType: ${chunk.metadata.semanticType}` : '';
            const keyTerms = chunk.metadata.keyTerms && chunk.metadata.keyTerms.length > 0 
              ? `\nKey Terms: ${chunk.metadata.keyTerms.join(', ')}` 
              : '';
            
            return `--- Context ${index + 1} ---${pageInfo}${topicInfo}${typeInfo}${keyTerms}\n${chunk.content}`;
          })
          .join('\n\n');
      }

      // Create enhanced system prompt with semantic awareness
      const systemPrompt = `You are a helpful AI assistant specialized in technical documentation analysis. You have access to semantically organized information from the TAS2781 technical document.

Context from the document (with semantic metadata):
${context}

Instructions:
- Answer questions based on the provided context from the TAS2781 documentation
- Pay attention to the semantic type (definition, instruction, specification, example, reference) of each context section
- Use the topic information and key terms to provide more targeted answers
- If the context doesn't contain relevant information, say so and offer to help with other aspects
- Be specific and reference page numbers when available
- Focus on technical details like registers, addresses, commands, and system configurations
- When discussing definitions, prioritize content marked as 'definition' type
- When providing instructions, prioritize content marked as 'instruction' type
- Use key terms to enhance technical accuracy`;

      // Generate response using Gemini
      const response = await this.gemini.generateResponse(userMessage, systemPrompt);
      
      return response;
      
    } catch (error) {
      console.error('Error in RAG chat:', error);
      return "I apologize, but I encountered an error processing your question. Please check your internet connection and try again.";
    }
  }

  private async semanticChunkText(text: string, maxChunkSize: number = 1000, source: string = '', page?: number): Promise<DocumentChunk[]> {
    try {
      console.log('Starting semantic chunking...');
      
      // For very small texts, return as single chunk
      if (text.length < 200) {
        return [{
          id: `${source}_page_${page || 0}_chunk_0`,
          content: text,
          metadata: {
            source,
            page,
            type: 'text',
            semanticType: 'general'
          }
        }];
      }

      // First, identify semantic sections using Gemini
      const sections = await this.identifySemanticSections(text);
      
      // Then create chunks respecting semantic boundaries
      const chunks: DocumentChunk[] = [];
      let chunkIndex = 0;
      
      for (const section of sections) {
        if (section.content.length <= maxChunkSize) {
          // Section fits in one chunk
          chunks.push({
            id: `${source}_page_${page || 0}_chunk_${chunkIndex++}`,
            content: section.content,
            metadata: {
              source,
              page,
              type: 'text',
              topic: section.topic,
              semanticType: section.semanticType,
              keyTerms: section.keyTerms
            }
          });
        } else {
          // Split large section while maintaining semantic coherence
          const subChunks = await this.splitLargeSection(section, maxChunkSize);
          for (const subChunk of subChunks) {
            chunks.push({
              id: `${source}_page_${page || 0}_chunk_${chunkIndex++}`,
              content: subChunk.content,
              metadata: {
                source,
                page,
                type: 'text',
                topic: section.topic,
                semanticType: section.semanticType,
                keyTerms: subChunk.keyTerms || section.keyTerms
              }
            });
          }
        }
      }
      
      console.log(`Created ${chunks.length} semantic chunks`);
      return chunks;
      
    } catch (error) {
      console.error('Error in semantic chunking, falling back to simple chunking:', error);
      // Fallback to simple chunking
      return this.fallbackChunkText(text, maxChunkSize, source, page);
    }
  }

  private async identifySemanticSections(text: string): Promise<Array<{
    content: string;
    topic: string;
    semanticType: 'definition' | 'instruction' | 'specification' | 'example' | 'reference' | 'general';
    keyTerms: string[];
  }>> {
    const prompt = `Analyze the following technical text and break it into logical semantic sections. For each section, identify:
1. The main topic/theme
2. The semantic type (definition, instruction, specification, example, reference, or general)
3. Key technical terms

Respond in JSON format with an array of sections:
[{
  "content": "the actual text content",
  "topic": "brief topic description",
  "semanticType": "one of: definition, instruction, specification, example, reference, general",
  "keyTerms": ["term1", "term2"]
}]

Text to analyze:
${text}`;

    try {
      const response = await this.gemini.generateResponse(prompt, 
        'You are a technical document analyzer. Respond only with valid JSON.');
      
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        const sections = JSON.parse(jsonMatch[0]);
        return sections.filter((section: any) => section.content && section.content.trim().length > 0);
      }
      
      throw new Error('No valid JSON found in response');
      
    } catch (error) {
      console.error('Error identifying semantic sections:', error);
      // Fallback: split by paragraphs
      return this.fallbackSemanticSplit(text);
    }
  }

  private async splitLargeSection(section: any, maxSize: number): Promise<Array<{
    content: string;
    keyTerms?: string[];
  }>> {
    const sentences = section.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    const chunks: Array<{ content: string; keyTerms?: string[] }> = [];
    
    let currentChunk = '';
    let currentTerms: string[] = [];
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length + 1 > maxSize && currentChunk) {
        chunks.push({ 
          content: currentChunk.trim(),
          keyTerms: [...new Set(currentTerms)]
        });
        currentChunk = trimmedSentence;
        currentTerms = this.extractKeyTermsFromText(trimmedSentence);
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        currentTerms = currentTerms.concat(this.extractKeyTermsFromText(trimmedSentence));
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({ 
        content: currentChunk.trim(),
        keyTerms: [...new Set(currentTerms)]
      });
    }
    
    return chunks;
  }

  private fallbackSemanticSplit(text: string): Array<{
    content: string;
    topic: string;
    semanticType: 'definition' | 'instruction' | 'specification' | 'example' | 'reference' | 'general';
    keyTerms: string[];
  }> {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, index) => {
      const content = paragraph.trim();
      const keyTerms = this.extractKeyTermsFromText(content);
      const semanticType = this.inferSemanticType(content);
      
      return {
        content,
        topic: `Section ${index + 1}`,
        semanticType,
        keyTerms
      };
    });
  }

  private extractKeyTermsFromText(text: string): string[] {
    // Extract technical terms, abbreviations, and important concepts
    const terms: string[] = [];
    
    // Match abbreviations (2-6 uppercase letters)
    const abbreviations = text.match(/\b[A-Z]{2,6}\b/g);
    if (abbreviations) terms.push(...abbreviations);
    
    // Match technical terms (words with numbers, hyphens, or mixed case)
    const technicalTerms = text.match(/\b[A-Za-z]*[0-9]+[A-Za-z0-9]*\b|\b[a-z]+[-_][a-z]+\b/g);
    if (technicalTerms) terms.push(...technicalTerms);
    
    // Match capitalized words that might be proper nouns or technical terms
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g);
    if (capitalizedWords) {
      terms.push(...capitalizedWords.filter(word => 
        word.length > 3 && !['The', 'This', 'That', 'When', 'Where', 'What', 'How'].includes(word)
      ));
    }
    
    return [...new Set(terms)].slice(0, 10); // Limit to 10 most relevant terms
  }

  private inferSemanticType(text: string): 'definition' | 'instruction' | 'specification' | 'example' | 'reference' | 'general' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('is defined as') || lowerText.includes('refers to') || lowerText.includes('means')) {
      return 'definition';
    }
    if (lowerText.includes('should') || lowerText.includes('must') || lowerText.includes('follow these steps')) {
      return 'instruction';
    }
    if (lowerText.includes('specification') || lowerText.includes('requirement') || lowerText.includes('standard')) {
      return 'specification';
    }
    if (lowerText.includes('example') || lowerText.includes('for instance') || lowerText.includes('such as')) {
      return 'example';
    }
    if (lowerText.includes('see') || lowerText.includes('refer to') || lowerText.includes('section')) {
      return 'reference';
    }
    
    return 'general';
  }

  private fallbackChunkText(text: string, chunkSize: number, source: string, page?: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentSize = 0;
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const sentenceLength = sentence.length;
      
      if (currentSize + sentenceLength > chunkSize && currentChunk) {
        chunks.push({
          id: `${source}_page_${page || 0}_chunk_${chunkIndex++}`,
          content: currentChunk.trim(),
          metadata: {
            source,
            page,
            type: 'text',
            semanticType: 'general'
          }
        });
        
        currentChunk = sentence;
        currentSize = sentenceLength;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentSize += sentenceLength;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        id: `${source}_page_${page || 0}_chunk_${chunkIndex++}`,
        content: currentChunk.trim(),
        metadata: {
          source,
          page,
          type: 'text',
          semanticType: 'general'
        }
      });
    }
    
    return chunks;
  }

  getStats(): any {
    const semanticTypes = this.documentChunks.reduce((acc, chunk) => {
      const type = chunk.metadata.semanticType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chunksWithTopics = this.documentChunks.filter(c => c.metadata.topic).length;
    const chunksWithKeyTerms = this.documentChunks.filter(c => c.metadata.keyTerms && c.metadata.keyTerms.length > 0).length;

    return {
      initialized: this.isInitialized,
      totalChunks: this.documentChunks.length,
      textChunks: this.documentChunks.filter(c => c.metadata.type === 'text').length,
      tableChunks: this.documentChunks.filter(c => c.metadata.type === 'table').length,
      imageChunks: this.documentChunks.filter(c => c.metadata.type === 'image').length,
      embeddingsGenerated: this.vectorIndex.size,
      semanticTypes,
      chunksWithTopics,
      chunksWithKeyTerms,
      avgKeyTermsPerChunk: chunksWithKeyTerms > 0 ? 
        this.documentChunks
          .filter(c => c.metadata.keyTerms)
          .reduce((sum, c) => sum + (c.metadata.keyTerms?.length || 0), 0) / chunksWithKeyTerms : 0
    };
  }
}