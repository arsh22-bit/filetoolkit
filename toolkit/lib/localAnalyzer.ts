import fs from 'fs';
import path from 'path';

class LocalAnalyzer {
  
  async analyzeFile(filePath: string, fileName: string, instructionFileUrl: string = ''): Promise<{
    success: boolean;
    feedback: string;
    timestamp: string;
    fileInfo?: {
      name: string;
      size: number;
      extension: string;
      lastModified: Date;
    };
    error?: string;
  }> {
    try {
      const stats = fs.statSync(filePath);
      const extension = path.extname(fileName).toLowerCase();
      const fileSize = stats.size;
      
      const analysis = {
        success: true,
        feedback: '',
        timestamp: new Date().toISOString(),
        fileInfo: {
          name: fileName,
          size: fileSize,
          extension: extension,
          lastModified: stats.mtime,
        }
      };

      // Basic file type analysis
      const fileTypeAnalysis = this.getFileTypeAnalysis(extension);
      
      // Content analysis for text files
      let contentAnalysis = '';
      if (this.isTextFile(extension)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          contentAnalysis = this.analyzeTextContent(content);
        } catch {
          contentAnalysis = 'Could not read file content for analysis.';
        }
      }

      // Combine analysis
      analysis.feedback = `## File Analysis Report

### File Information
- **Name**: ${fileName}
- **Type**: ${fileTypeAnalysis.type}
- **Size**: ${this.formatFileSize(fileSize)}
- **Extension**: ${extension || 'none'}

### File Type Analysis
${fileTypeAnalysis.description}

${contentAnalysis}

### Instructions Provided
${instructionFileUrl ? `Instruction file URL provided: ${instructionFileUrl}\n(Local analysis cannot access remote instruction files - upgrade to AI analysis for full instruction support)` : 'No specific analysis instructions were provided.'}

### Analysis Limitations
This is a basic local analysis. For more detailed AI-powered analysis, configure the Gemini API or wait for rate limits to reset.

### Recommendations
${fileTypeAnalysis.recommendations}
`;

      return analysis;
    } catch (error) {
      console.error('Error in local file analysis:', error);
      return {
        success: false,
        error: 'Failed to analyze file locally',
        feedback: 'Could not perform local file analysis. Please check file permissions and try again.',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.js', '.ts', '.html', '.css', '.py', '.java', '.cpp', '.c', '.h', '.yaml', '.yml', '.toml', '.ini', '.log'];
    return textExtensions.includes(extension);
  }

  private getFileTypeAnalysis(extension: string) {
    const analyses: { [key: string]: { type: string, description: string, recommendations: string } } = {
      '.xlsx': {
        type: 'Excel Spreadsheet',
        description: 'Microsoft Excel spreadsheet file. This is a binary format that typically contains structured data in rows and columns across multiple sheets.',
        recommendations: '- Verify data integrity across all sheets\n- Check for formula errors\n- Validate data consistency\n- Consider CSV export for compatibility'
      },
      '.xls': {
        type: 'Legacy Excel Spreadsheet',
        description: 'Older Microsoft Excel format. May have compatibility issues with newer software.',
        recommendations: '- Consider converting to .xlsx format\n- Backup before conversion\n- Test with target applications'
      },
      '.csv': {
        type: 'Comma-Separated Values',
        description: 'Plain text file with comma-separated data. Widely compatible and easy to process.',
        recommendations: '- Verify delimiter consistency\n- Check for proper quoting of text fields\n- Validate data types in each column'
      },
      '.pdf': {
        type: 'Portable Document Format',
        description: 'Fixed-layout document format. Good for sharing formatted documents.',
        recommendations: '- Ensure text is selectable (not scanned image)\n- Check accessibility features\n- Verify font embedding for compatibility'
      },
      '.docx': {
        type: 'Word Document',
        description: 'Microsoft Word document in modern XML format.',
        recommendations: '- Check for track changes and comments\n- Verify formatting consistency\n- Consider PDF export for final distribution'
      },
      '.txt': {
        type: 'Plain Text',
        description: 'Simple text file without formatting. Universally compatible.',
        recommendations: '- Check character encoding (UTF-8 recommended)\n- Verify line endings for target platform\n- Consider structured format if data is complex'
      },
      '.json': {
        type: 'JSON Data',
        description: 'JavaScript Object Notation data file. Structured data format.',
        recommendations: '- Validate JSON syntax\n- Check data structure consistency\n- Consider schema validation'
      }
    };

    const defaultAnalysis = {
      type: 'Unknown File Type',
      description: `File with extension ${extension || 'none'} - binary or unsupported format.`,
      recommendations: '- Verify file integrity\n- Check if specialized software is needed\n- Consider format conversion if needed'
    };

    return analyses[extension] || defaultAnalysis;
  }

  private analyzeTextContent(content: string): string {
    const lines = content.split('\n');
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = content.length;
    
    let analysis = `\n### Content Analysis
- **Lines**: ${lines.length}
- **Words**: ${wordCount}
- **Characters**: ${charCount}
`;

    // Check for common issues
    const issues = [];
    
    if (content.includes('\r\n') && content.includes('\n')) {
      issues.push('Mixed line endings detected');
    }
    
    if (content.includes('\t') && content.includes('  ')) {
      issues.push('Mixed indentation (tabs and spaces)');
    }

    // Check for common data patterns
    if (content.includes(',') && lines.length > 1) {
      analysis += '\n- **Possible CSV data detected**';
    }
    
    if (content.includes('{') && content.includes('}')) {
      analysis += '\n- **Possible JSON structure detected**';
    }

    if (issues.length > 0) {
      analysis += `\n\n### Potential Issues
${issues.map(issue => `- ${issue}`).join('\n')}`;
    }

    return analysis;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default LocalAnalyzer;
