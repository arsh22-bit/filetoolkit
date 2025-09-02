import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import fs from 'fs';

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

  // NEW METHOD: Analyze file directly from local file path
  async analyzeFileDirectly(filePath: string, fileName: string, instructionContent: string = '', customPrompt?: string) {
    try {
      // Get file info
      const stats = fs.statSync(filePath);
      const extension = fileName.toLowerCase().split('.').pop();
      
      let fileContent = '';
      let analysisPrompt = '';
      
      // Handle different file types
      if (this.isTextFile(extension)) {
        // For text files, read the content directly
        fileContent = fs.readFileSync(filePath, 'utf-8');
        
        let instructions = instructionContent || 'Provide a comprehensive analysis of the file content, structure, and quality.';
        if (customPrompt) {
          instructions += `\n\nAdditional custom instructions: ${customPrompt}`;
        }
        
        analysisPrompt = `
Please analyze this ${extension} file named "${fileName}":

--- FILE CONTENT START ---
${fileContent}
--- FILE CONTENT END ---

File size: ${stats.size} bytes

Instructions for analysis:
${instructions}

Please:
1. Identify the file type and format
2. Analyze the data structure, content, and quality
3. Identify any issues, inconsistencies, or areas for improvement
4. Provide specific feedback and recommendations
5. Format your response in a clear, structured manner
        `;
      } else {
        // For binary files, provide metadata analysis
        let instructions = instructionContent || 'Provide a comprehensive analysis of the file type, format, and recommendations.';
        if (customPrompt) {
          instructions += `\n\nAdditional custom instructions: ${customPrompt}`;
        }
        
        analysisPrompt = `
Please analyze this ${extension} file named "${fileName}":

File Information:
- Name: ${fileName}
- Type: ${extension ? '.' + extension : 'unknown'}
- Size: ${this.formatFileSize(stats.size)}
- Last Modified: ${stats.mtime.toISOString()}

Instructions for analysis:
${instructions}

Note: This is a binary file format. Please provide analysis based on the file type, size, and general recommendations for this type of file.

Please:
1. Identify what this file type is typically used for
2. Comment on the file size (is it reasonable for this type?)
3. Provide recommendations for handling this file type
4. Suggest tools or methods for deeper analysis if needed
5. Format your response in a clear, structured manner
        `;
      }

      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const feedback = response.text();

      return {
        success: true,
        feedback,
        timestamp: new Date().toISOString(),
        fileInfo: {
          name: fileName,
          size: stats.size,
          extension: extension ? '.' + extension : '',
          lastModified: stats.mtime,
          isTextFile: this.isTextFile(extension)
        }
      };
    } catch (error) {
      console.error('Error analyzing file directly with Gemini:', error);
      
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
      
      throw new Error('Failed to analyze file directly with Gemini API');
    }
  }

  private isTextFile(extension: string | undefined): boolean {
    if (!extension) return false;
    const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'h', 'yaml', 'yml', 'toml', 'ini', 'log', 'sql', 'sh', 'bat'];
    return textExtensions.includes(extension.toLowerCase());
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default GeminiService;
