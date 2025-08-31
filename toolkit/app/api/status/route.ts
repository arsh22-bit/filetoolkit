import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check which services are properly configured
    const hasGoogleDrive = !!(
      process.env.GOOGLE_PROJECT_ID && 
      process.env.GOOGLE_PRIVATE_KEY && 
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    );
    
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasSharedDrive = !!process.env.GOOGLE_SHARED_DRIVE_ID;

    const status = {
      services: {
        localAnalysis: {
          available: true,
          status: 'ready',
          description: 'Basic file analysis using local processing'
        },
        googleDrive: {
          available: hasGoogleDrive,
          status: hasGoogleDrive ? (hasSharedDrive ? 'ready' : 'needs-shared-drive') : 'not-configured',
          description: hasGoogleDrive 
            ? (hasSharedDrive 
              ? 'Google Drive backup ready with shared drive' 
              : 'Google Drive configured but needs shared drive ID')
            : 'Google Drive not configured'
        },
        geminiAnalysis: {
          available: hasGemini,
          status: hasGemini ? 'ready' : 'not-configured',
          description: hasGemini 
            ? 'AI-powered analysis available' 
            : 'Gemini API not configured'
        }
      },
      recommendations: []
    };

    // Add recommendations based on configuration
    if (!hasGoogleDrive) {
      status.recommendations.push({
        service: 'googleDrive',
        message: 'Configure Google Drive service account credentials for file backup',
        priority: 'medium'
      });
    } else if (!hasSharedDrive) {
      status.recommendations.push({
        service: 'googleDrive',
        message: 'Set GOOGLE_SHARED_DRIVE_ID to enable Google Drive uploads (service accounts require shared drives)',
        priority: 'high'
      });
    }

    if (!hasGemini) {
      status.recommendations.push({
        service: 'gemini',
        message: 'Configure GEMINI_API_KEY for AI-powered file analysis',
        priority: 'medium'
      });
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Error checking service status:', error);
    return NextResponse.json(
      { error: 'Failed to check service status' },
      { status: 500 }
    );
  }
}
