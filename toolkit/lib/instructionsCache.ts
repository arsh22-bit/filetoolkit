// Global instruction cache for serverless environments
export interface PMPChecklistItem {
  srNo: number;
  checklist: string;
  compliance: string;
  remark: string;
}

export interface InstructionData {
  id: string;
  fileName: string;
  content: string;
  publicUrl: string | null;
  directUrl: string | null;
  fileId: string | null;
  createdAt: string;
  hasGoogleDriveBackup: boolean;
  specialInstruction?: string;
  isPMPA?: boolean;
  feedback?: string;
  inputData?: Record<string, string>;
  customPrompt?: string;
  pmpChecklist?: PMPChecklistItem[];
}

// Use global to persist across serverless function invocations
declare global {
  var instructionsCache: Map<string, InstructionData> | undefined;
}

// Initialize if not exists
if (!global.instructionsCache) {
  global.instructionsCache = new Map<string, InstructionData>();
}

export const instructionsCache = global.instructionsCache;
