import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { instructionsCache } from '@/lib/instructionsCache';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const INSTRUCTIONS_DIR = path.join(process.cwd(), 'instructions');

interface PMPChecklistItem {
  srNo: number;
  checklist: string;
  compliance: string;
  remark: string;
}

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
  pmpChecklist?: PMPChecklistItem[];
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

    // Generate PMP-A checklist compliance analysis
    const checklistPrompt = `You are a PMP-A compliance expert analyzing project documentation. Based on the following instruction content, fill out the PMP-A compliance checklist.

INSTRUCTION CONTENT TO ANALYZE:
${content}

${metadata.customPrompt ? `CUSTOM ANALYSIS INSTRUCTIONS: ${metadata.customPrompt}` : ''}

PMP-A COMPLIANCE CHECKLIST TO FILL:

1. Change History - Is document control maintained? Eg. Ver No, reviewed and approved
2. Resource Tracker - Is this section contains updated Infrastructure Plan, Human Resource Plan, Training Plan?
3. ACD Tracker - Is Assumption, Constraint and Dependencies tracker maintained?
4. CI & Review Plan - Is all CI work products maintains there versions, location, baseline, approval? Is name of the artifact follow the naming convention as defined by the project in PMP?
5. Non CI & Records - Is all Non CI work products maintains there versions, location & Records? Is name of the artifact follow the naming convention as defined by the project in PMP?
6. Lesson Learnt, Improvements and Best Practices - Is details of Lesson Learnt articulated well and accepted? Is mentioned improvement logged into digite? Is best practices identified and applied in the project? Is Unique ID is given to each learning and best practice.
7. Requirement Provider - Is requirement providers details identify? Who will be giving details on requirements of the project.
8. Supplier - Is PM mention the Name of the supplier? Is PM mention the products being supplied by the supplier?

FOR EACH CHECKLIST ITEM, PROVIDE:
- Compliance Status: "Yes", "No", "Partial", or "Not Found" (if the document doesn't contain relevant information)
- Remark: Specific details about what was found or missing, with references to the content

RESPOND IN THIS EXACT JSON FORMAT:
{
  "checklist": [
    {
      "srNo": 1,
      "checklist": "Change History - Is document control maintained? Eg. Ver No, reviewed and approved",
      "compliance": "Yes/No/Partial/Not Found",
      "remark": "Specific remark about what was found or missing"
    },
    {
      "srNo": 2,
      "checklist": "Resource Tracker - Is this section contains updated Infrastructure Plan, Human Resource Plan, Training Plan?",
      "compliance": "Yes/No/Partial/Not Found",
      "remark": "Specific remark about what was found or missing"
    }
    // ... continue for all 8 items
  ]
}

IMPORTANT: 
- Be specific in your remarks - quote exact text from the content when possible
- If information is not found, clearly state "Not mentioned in the provided document"
- For partial compliance, explain what is present and what is missing
- Use professional, clear language suitable for project management documentation`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(checklistPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    if (!aiResponse) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate checklist analysis' 
      }, { status: 500 });
    }

    // Parse the JSON response from AI
    let pmpChecklist: PMPChecklistItem[] = [];
    try {
      // Extract JSON from the response (AI might include additional text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        pmpChecklist = jsonResponse.checklist || [];
      }
    } catch (error) {
      console.error('Failed to parse AI checklist response:', error);
      // Fallback: create default checklist structure
      pmpChecklist = Array.from({length: 8}, (_, i) => ({
        srNo: i + 1,
        checklist: `Checklist item ${i + 1}`,
        compliance: 'Not Found',
        remark: 'AI analysis failed to parse response'
      }));
    }

    // Update the instruction with the generated checklist
    const updatedMetadata = {
      ...metadata,
      pmpChecklist: pmpChecklist,
    };

    // Update cache if instruction was from cache
    if (cachedInstruction) {
      const updatedInstructionData = {
        ...cachedInstruction,
        pmpChecklist: pmpChecklist,
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
      checklist: pmpChecklist,
      instruction: updatedMetadata
    });

  } catch (error) {
    console.error('Error generating PMP checklist:', error);
    
    if (error instanceof Error && error.message.includes('API_KEY')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gemini API authentication failed. Please check your API key.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while generating checklist' 
    }, { status: 500 });
  }
}
