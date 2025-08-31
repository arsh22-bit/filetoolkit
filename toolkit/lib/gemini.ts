import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async analyzeFile(fileUrl: string, instructionContent: string = '') {
    try {
      const basePrompt = `
Please analyze the file available at this URL: ${fileUrl}

Instructions for analysis:
${instructionContent || 'Provide a comprehensive analysis of the file content, structure, and quality.'}

Please:
1. Identify the file type and format
2. If it's an Excel file, go through ALL tabs
3. Analyze the data structure, content, and quality
4. Identify any issues, inconsistencies, or areas for improvement
5. Provide specific feedback and recommendations
6. Format your response in a clear, structured manner

If you cannot access the file directly, please let me know and I'll provide the data in a different format.
      `;

      const result = await this.model.generateContent(basePrompt);
      const response = await result.response;
      const feedback = response.text();

      return {
        success: true,
        feedback,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error analyzing file with Gemini:', error);
      
      // Handle specific rate limiting errors
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('quota')) {
          console.warn('Gemini API rate limit exceeded. Please wait before trying again.');
          throw new Error('Gemini API rate limit exceeded. Please try again in a few minutes.');
        }
        
        if (error.message.includes('GEMINI_API_KEY')) {
          throw new Error('Gemini API key not configured or invalid');
        }
      }
      
      throw new Error('Failed to analyze file with Gemini API');
    }
  }

  async analyzeFileWithInstruction(fileUrl: string, instructionFileUrl: string | null) {
    try {
      const basePrompt = instructionFileUrl 
        ? `Please analyze the file at this URL: ${fileUrl}

Use the instructions provided in this file: ${instructionFileUrl}

Please:
1. First review the instruction file to understand the analysis requirements
2. Then analyze the main file according to those instructions
3. Provide detailed feedback based on the specified criteria
4. Format your response in a clear, structured manner

If you cannot access either file directly, please let me know and I'll provide the data in a different format.`
        : `Please analyze the file available at this URL: ${fileUrl}

Please:
1. Identify the file type and format
2. If it's an Excel file, go through ALL tabs
3. Analyze the data structure, content, and quality
4. Identify any issues, inconsistencies, or areas for improvement
5. Provide specific feedback and recommendations
6. Format your response in a clear, structured manner

If you cannot access the file directly, please let me know and I'll provide the data in a different format.`;

      const result = await this.model.generateContent(basePrompt);
      const response = await result.response;
      const feedback = response.text();

      return {
        success: true,
        feedback,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error analyzing file with instruction:', error);
      
      // Handle specific rate limiting errors
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('quota')) {
          console.warn('Gemini API rate limit exceeded. Please wait before trying again.');
          throw new Error('Gemini API rate limit exceeded. Please try again in a few minutes.');
        }
        
        if (error.message.includes('GEMINI_API_KEY')) {
          throw new Error('Gemini API key not configured or invalid');
        }
      }
      
      throw new Error('Failed to analyze file with instruction');
    }
  }

  async analyzeWithCustomPrompt(fileUrl: string, customPrompt: string) {
    try {
      const prompt = `
File URL: ${fileUrl}

${customPrompt}
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const feedback = response.text();

      return {
        success: true,
        feedback,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error analyzing file with custom prompt:', error);
      
      // Handle specific rate limiting errors
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('quota')) {
          console.warn('Gemini API rate limit exceeded. Please wait before trying again.');
          throw new Error('Gemini API rate limit exceeded. Please try again in a few minutes.');
        }
        
        if (error.message.includes('GEMINI_API_KEY')) {
          throw new Error('Gemini API key not configured or invalid');
        }
      }
      
      throw new Error('Failed to analyze file with custom prompt');
    }
  }
}

export default GeminiService;
