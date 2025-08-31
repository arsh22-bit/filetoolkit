import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import GoogleDriveService from '@/lib/googleDrive';
import GeminiService from '@/lib/gemini';
import LocalAnalyzer from '@/lib/localAnalyzer';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const instructionFileId = formData.get('instructionFileId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    tempFilePath = path.join(tempDir, `${timestamp}_${safeName}`);
    fs.writeFileSync(tempFilePath, buffer);

    // Get instruction file URL if instruction file ID is provided
    let instructionFileUrl = null;
    if (instructionFileId) {
      try {
        const metadataPath = path.join(process.cwd(), 'instructions', `${instructionFileId}.meta.json`);
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          instructionFileUrl = metadata.directUrl || metadata.publicUrl;
          console.log('Found instruction file URL:', instructionFileUrl);
        } else {
          console.warn('No metadata found for instruction file:', instructionFileId);
        }
      } catch (error) {
        console.warn('Error reading instruction file metadata:', error);
      }
    }

    // Check what services are available
    const hasGoogleDrive = !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    const hasGemini = !!process.env.GEMINI_API_KEY;
    
    console.log('Available services:', { hasGoogleDrive, hasGemini });

    // Always perform local analysis first (this is guaranteed to work)
    const localAnalyzer = new LocalAnalyzer();
    let analysisResult = await localAnalyzer.analyzeFile(tempFilePath, file.name, instructionFileUrl || '');

    // Try Google Drive upload (optional)
    let uploadResult = null;
    let driveError = null;
    
    if (hasGoogleDrive) {
      try {
        const driveService = new GoogleDriveService();
        const result = await driveService.uploadFile(tempFilePath, file.name);
        
        if (result && result.success) {
          uploadResult = result;
          console.log('Google Drive upload successful');
        } else {
          driveError = result?.error || 'Upload failed';
          console.warn('Google Drive upload failed:', driveError);
        }
      } catch (error) {
        driveError = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Google Drive upload failed with exception:', error);
      }
    } else {
      driveError = 'Google Drive not configured';
    }

    // Try Gemini analysis (optional, only if we have a drive URL)
    let aiAnalysisResult = null;
    let geminiError = null;
    
    if (hasGemini && uploadResult && uploadResult.directUrl) {
      try {
        const geminiService = new GeminiService();
        aiAnalysisResult = await geminiService.analyzeFileWithInstruction(
          uploadResult.directUrl,
          instructionFileUrl
        );
        
        if (aiAnalysisResult && aiAnalysisResult.success) {
          // Replace local analysis with AI analysis if successful
          analysisResult = aiAnalysisResult;
          console.log('Gemini analysis successful');
        } else {
          geminiError = 'Analysis failed';
        }
      } catch (error) {
        geminiError = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Gemini analysis failed:', error);
      }
    } else if (!hasGemini) {
      geminiError = 'Gemini API not configured';
    } else if (!uploadResult) {
      geminiError = 'No file URL available for AI analysis';
    }

    // Determine service status
    const serviceStatus = {
      localAnalysis: analysisResult.success,
      googleDrive: uploadResult ? 'success' : (driveError || 'failed'),
      geminiAnalysis: aiAnalysisResult ? 'success' : (geminiError || 'unavailable'),
    };

    // Create comprehensive response
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: buffer.length,
        fileId: uploadResult?.fileId || null,
        publicUrl: uploadResult?.publicUrl || null,
        directUrl: uploadResult?.directUrl || null,
      },
      analysis: analysisResult,
      serviceStatus,
      message: getStatusMessage(serviceStatus),
    });

  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Always clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (error) {
        console.warn('Failed to clean up temporary file:', error);
      }
    }
  }
}

interface ServiceStatus {
  localAnalysis: boolean;
  googleDrive: string;
  geminiAnalysis: string;
}

function getStatusMessage(status: ServiceStatus): string {
  if (status.googleDrive === 'success' && status.geminiAnalysis === 'success') {
    return 'File uploaded to Google Drive and analyzed with AI successfully!';
  } else if (status.localAnalysis && status.googleDrive === 'success') {
    return 'File uploaded to Google Drive with local analysis (AI analysis unavailable).';
  } else if (status.localAnalysis) {
    return 'File analyzed locally. Configure Google Drive and Gemini API for enhanced features.';
  } else {
    return 'File processed with limited features. Check configuration and try again.';
  }
}
