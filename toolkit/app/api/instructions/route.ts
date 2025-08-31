import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import GoogleDriveService from '@/lib/googleDrive';

// Ensure instructions directory exists
const instructionsDir = path.join(process.cwd(), 'instructions');
if (!fs.existsSync(instructionsDir)) {
  fs.mkdirSync(instructionsDir, { recursive: true });
}

export async function POST(request: NextRequest) {
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
    const localPath = path.join(instructionsDir, `${instructionId}.txt`);
    
    // Save instruction content locally
    fs.writeFileSync(localPath, content);
    
    // Try to upload to Google Drive for backup (optional)
    let driveFile = null;
    try {
      const driveService = new GoogleDriveService();
      driveFile = await driveService.uploadFile(
        localPath,
        `${instructionId}_${file.name}`,
        'text/plain'
      );
      
      if (!driveFile.success) {
        console.warn('Google Drive upload failed:', driveFile.error);
      }
    } catch (error) {
      console.warn('Google Drive upload failed, continuing without backup:', error);
      driveFile = { success: false, error: 'Upload failed' };
    }

    // Save metadata with URLs
    const metadata = {
      instructionId,
      fileName: file.name,
      publicUrl: driveFile?.publicUrl || null,
      directUrl: driveFile?.directUrl || null,
      fileId: driveFile?.fileId || null,
      createdAt: new Date().toISOString(),
      hasGoogleDriveBackup: driveFile?.success || false,
    };
    const metadataPath = path.join(instructionsDir, `${instructionId}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

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
        'File uploaded successfully (Google Drive backup unavailable)',
    });

  } catch (error) {
    console.error('Error uploading instruction file:', error);
    return NextResponse.json(
      { error: 'Failed to upload instruction file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // List all instruction files
    const files = fs.readdirSync(instructionsDir);
    const instructions = files
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const instructionId = file.replace('.txt', '');
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
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
