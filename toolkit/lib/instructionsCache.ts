// Global instruction cache for serverless environments
export interface InstructionData {
  id: string;
  fileName: string;
  content: string;
  publicUrl: string | null;
  directUrl: string | null;
  fileId: string | null;
  createdAt: string;
  hasGoogleDriveBackup: boolean;
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
