import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import GoogleDriveService from '@/lib/googleDrive';
import { instructionsCache } from '@/lib/instructionsCache';

// Safe directory creation for different environments
function getSafeInstructionsDir(): string | null {
  try {
    // For Vercel and other serverless environments, use /tmp
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const tmpDir = '/tmp/instructions';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    }
    
    // For local development
    const localDir = path.join(process.cwd(), 'instructions');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (error) {
    console.warn('Cannot create instructions directory, using memory-only storage:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('instruction') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No instruction file provided' }, { status: 400 });
    }

    // Read file content - try to extract text from various file types
    const bytes = await file.arrayBuffer();
    let content: string;
    
    // For text-based files, read as UTF-8
    const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.js', '.ts', '.html', '.css'];
    const isTextFile = textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (isTextFile) {
      content = Buffer.from(bytes).toString('utf-8');
    } else {
      // For binary files, store a placeholder message
      content = `[Binary file: ${file.name}] - Content will be processed by AI when analyzing files.`;
    }
    
    // Generate unique ID for the instruction file
    const instructionId = `instruction_${Date.now()}`;
    
    // Save to temporary file for Google Drive upload
    const tempDir = '/tmp';
    tempFilePath = path.join(tempDir, `${instructionId}.txt`);
    fs.writeFileSync(tempFilePath, content);
    
    // Try to upload to Google Drive (required for serverless)
    let driveFile = null;
    try {
      const driveService = new GoogleDriveService();
      driveFile = await driveService.uploadFile(
        tempFilePath,
        `${instructionId}_${file.name}`,
        'text/plain'
      );
      
      if (!driveFile.success) {
        console.warn('Google Drive upload failed:', driveFile.error);
      }
    } catch (error) {
      console.warn('Google Drive upload failed:', error);
      driveFile = { success: false, error: 'Upload failed' };
    }

    // Store in memory cache for this session
    const instructionData = {
      id: instructionId,
      fileName: file.name,
      content,
      publicUrl: driveFile?.publicUrl || null,
      directUrl: driveFile?.directUrl || null,
      fileId: driveFile?.fileId || null,
      createdAt: new Date().toISOString(),
      hasGoogleDriveBackup: driveFile?.success || false,
    };
    
    instructionsCache.set(instructionId, instructionData);
    
    // Try to save locally if possible (for local development)
    const instructionsDir = getSafeInstructionsDir();
    if (instructionsDir) {
      try {
        const localPath = path.join(instructionsDir, `${instructionId}.txt`);
        const metadataPath = path.join(instructionsDir, `${instructionId}.meta.json`);
        fs.writeFileSync(localPath, content);
        fs.writeFileSync(metadataPath, JSON.stringify(instructionData, null, 2));
      } catch (error) {
        console.warn('Could not save locally, relying on memory and Google Drive:', error);
      }
    }

    return NextResponse.json({
      success: true,
      instructionId,
      fileName: file.name,
      content,
      driveFile,
      publicUrl: driveFile?.publicUrl || null,
      directUrl: driveFile?.directUrl || null,
      message: driveFile && driveFile.success ? 
        'File uploaded successfully with Google Drive backup' : 
        'File stored in session (configure Google Drive for persistence)',
    });

  } catch (error) {
    console.error('Error uploading instruction file:', error);
    return NextResponse.json(
      { error: 'Failed to upload instruction file' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (error) {
        console.warn('Failed to clean up temp file:', error);
      }
    }
  }
}

export async function GET() {
  try {
    interface InstructionItem {
      id: string;
      content: string;
      fullContent: string;
      createdAt: Date;
      size: number;
      publicUrl: string | null;
      directUrl: string | null;
      fileId: string | null;
      fileName: string;
      hasGoogleDriveBackup: boolean;
    }
    
    let instructions: Array<InstructionItem> = [];
    
    // First, try to get from memory cache
    const cacheInstructions = Array.from(instructionsCache.values()).map(item => ({
      id: item.id,
      content: item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''),
      fullContent: item.content,
      createdAt: new Date(item.createdAt),
      size: item.content.length,
      publicUrl: item.publicUrl,
      directUrl: item.directUrl,
      fileId: item.fileId,
      fileName: item.fileName,
      hasGoogleDriveBackup: item.hasGoogleDriveBackup,
    }));
    
    instructions = [...cacheInstructions];
    
    // Also try to read from filesystem if available (for local development)
    const instructionsDir = getSafeInstructionsDir();
    if (instructionsDir) {
      try {
        const files = fs.readdirSync(instructionsDir);
        const fileInstructions = files
          .filter(file => file.endsWith('.txt'))
          .map(file => {
            const instructionId = file.replace('.txt', '');
            
            // Skip if already in cache
            if (instructionsCache.has(instructionId)) {
              return null;
            }
            
            try {
              const filePath = path.join(instructionsDir, file);
              const content = fs.readFileSync(filePath, 'utf-8');
              const stats = fs.statSync(filePath);
              
              // Try to read metadata
              let metadata = null;
              try {
                const metadataPath = path.join(instructionsDir, `${instructionId}.meta.json`);
                if (fs.existsSync(metadataPath)) {
                  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                }
              } catch (error) {
                console.warn('Could not read metadata for', instructionId, error);
              }
              
              return {
                id: instructionId,
                content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
                fullContent: content,
                createdAt: stats.birthtime,
                size: stats.size,
                publicUrl: metadata?.publicUrl || null,
                directUrl: metadata?.directUrl || null,
                fileId: metadata?.fileId || null,
                fileName: metadata?.fileName || file.replace('.txt', ''),
                hasGoogleDriveBackup: metadata?.hasGoogleDriveBackup || false,
              };
            } catch (error) {
              console.warn('Error reading instruction file:', file, error);
              return null;
            }
          })
          .filter((instruction): instruction is InstructionItem => instruction !== null);
        
        instructions = [...instructions, ...fileInstructions];
      } catch (error) {
        console.warn('Could not read from filesystem, using cache only:', error);
      }
    }
    
    // Sort by creation date
    instructions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      instructions,
    });

  } catch (error) {
    console.error('Error fetching instruction files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instruction files' },
      { status: 500 }
    );
  }
}
