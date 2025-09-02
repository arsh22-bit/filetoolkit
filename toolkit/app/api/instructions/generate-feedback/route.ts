import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { instructionsCache } from '@/lib/instructionsCache';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const INSTRUCTIONS_DIR = path.join(process.cwd(), 'instructions');

interface InstructionMetadata {
  id: string;
  fileName: string;
  createdAt: string;
  size: number;
  specialInstruction?: string;
  isPMPA?: boolean;
  feedback?: string;
  inputData?: Record<string, string>;
  customPrompt?: string;
  content?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instructionId } = body;

    if (!instructionId) {
      return NextResponse.json({ success: false, error: 'Instruction ID is required' }, { status: 400 });
    }

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gemini API key not configured. Please set GEMINI_API_KEY environment variable.' 
      }, { status: 500 });
    }

    // Get instruction from cache first
    const cachedInstruction = instructionsCache.get(instructionId);
    let metadata: InstructionMetadata;
    let content: string;

    if (cachedInstruction) {
      metadata = {
        id: cachedInstruction.id,
        fileName: cachedInstruction.fileName,
        createdAt: cachedInstruction.createdAt,
        size: cachedInstruction.content.length,
        specialInstruction: cachedInstruction.specialInstruction,
        isPMPA: cachedInstruction.isPMPA,
        feedback: cachedInstruction.feedback,
        inputData: cachedInstruction.inputData,
        customPrompt: cachedInstruction.customPrompt,
        content: cachedInstruction.content
      };
      content = cachedInstruction.content;
    } else {
      // Fallback to reading from filesystem
      const metaPath = path.join(INSTRUCTIONS_DIR, `${instructionId}.meta.json`);
      if (!fs.existsSync(metaPath)) {
        return NextResponse.json({ success: false, error: 'Instruction not found' }, { status: 404 });
      }

      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

      // Read instruction content
      const contentPath = path.join(INSTRUCTIONS_DIR, `${instructionId}.txt`);
      if (!fs.existsSync(contentPath)) {
        return NextResponse.json({ success: false, error: 'Instruction content not found' }, { status: 404 });
      }

      content = fs.readFileSync(contentPath, 'utf-8');
    }

    // Generate AI feedback based on content using Gemini
    const instructionType = metadata.isPMPA ? 'PMP-A (Project Management Professional - Assessment)' : 'general instruction';
    const fileName = metadata.fileName || 'unknown';
    const isExcelFile = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    const isSpreadsheetData = content.includes('BDM_PMPA.xlsx') || content.includes('PMP-A') || isExcelFile;
    
    const feedbackPrompt = `You are an expert data analyst and project management consultant reviewing a ${instructionType} instruction file.

FILE INFORMATION:
- File Name: ${fileName}
- Type: ${isExcelFile ? 'Excel Spreadsheet' : 'Text Document'}
- Contains PMP-A Data: ${metadata.isPMPA ? 'Yes' : 'No'}

INSTRUCTION CONTENT:
${content}

${metadata.customPrompt ? `CUSTOM ANALYSIS INSTRUCTIONS: ${metadata.customPrompt}` : ''}

${metadata.inputData && Object.keys(metadata.inputData).length > 0 ? 
  `ADDITIONAL INPUT DATA:\n${Object.entries(metadata.inputData).map(([key, value]) => `${key}: ${value}`).join('\n')}` : ''}

${isSpreadsheetData ? `
SPECIAL INSTRUCTIONS FOR SPREADSHEET ANALYSIS:
Since this appears to involve Excel/spreadsheet data, provide specific recommendations for:
- Data validation techniques for spreadsheet columns
- Excel-specific validation tools and formulas
- How to handle multi-tab/sheet analysis
- Recommendations for data quality checks in spreadsheet format
` : ''}

Please provide comprehensive feedback covering:

1. **Content Analysis**: 
   - Clarity and completeness of the instructions
   - Specific gaps or ambiguities identified
   ${isSpreadsheetData ? '- Spreadsheet-specific data validation recommendations' : ''}

2. **Structure and Organization**: 
   - How well-organized and logical is the content?
   - Suggested improvements for better flow
   ${isExcelFile ? '- Recommendations for multi-sheet analysis approach' : ''}

3. **${metadata.isPMPA ? 'PMP-A Standards Compliance' : 'Best Practices Alignment'}**: 
   ${metadata.isPMPA ? '- Alignment with PMP-A assessment criteria and standards' : '- Adherence to industry best practices for instruction writing'}
   - Areas where standards could be better addressed

4. **Actionability and Implementation**: 
   - How actionable and specific are the instructions?
   - Missing steps or procedures that should be included
   ${isSpreadsheetData ? '- Specific Excel tools and functions that could be utilized' : ''}

5. **Data Quality Recommendations** ${isSpreadsheetData ? '(Excel-Focused)' : ''}:
   ${isSpreadsheetData ? 
     `- Specific validation rules for Excel columns and data types
   - Cross-field validation strategies for related data
   - Automated validation approaches using Excel features
   - Data profiling and quality assessment techniques` : 
     '- General data quality considerations and validation approaches'}

6. **Practical Implementation Steps**:
   - Concrete next steps for implementing these instructions
   - Tools and resources needed
   ${isSpreadsheetData ? '- Excel-specific implementation guidance' : ''}

PROVIDE SPECIFIC, ACTIONABLE RECOMMENDATIONS. If this involves Excel data analysis, be explicit about Excel functions, validation rules, and spreadsheet best practices. Format your response with clear sections and bullet points for easy implementation.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(feedbackPrompt);
    const response = await result.response;
    const generatedFeedback = response.text();

    if (!generatedFeedback) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate feedback' 
      }, { status: 500 });
    }

    // Update the instruction with the generated feedback
    const updatedMetadata = {
      ...metadata,
      feedback: generatedFeedback,
    };

    // Update cache if instruction was from cache
    if (cachedInstruction) {
      const updatedInstructionData = {
        ...cachedInstruction,
        feedback: generatedFeedback,
      };
      instructionsCache.set(instructionId, updatedInstructionData);
    }

    // Save updated metadata to filesystem if available
    if (!cachedInstruction) {
      const metaPath = path.join(INSTRUCTIONS_DIR, `${instructionId}.meta.json`);
      if (fs.existsSync(metaPath)) {
        fs.writeFileSync(metaPath, JSON.stringify(updatedMetadata, null, 2));
      }
    }

    return NextResponse.json({ 
      success: true, 
      feedback: generatedFeedback,
      instruction: updatedMetadata
    });

  } catch (error) {
    console.error('Error generating feedback:', error);
    
    if (error instanceof Error && error.message.includes('API_KEY')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gemini API authentication failed. Please check your API key.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while generating feedback' 
    }, { status: 500 });
  }
}
