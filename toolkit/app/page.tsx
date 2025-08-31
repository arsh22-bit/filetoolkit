'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import { FileText, Settings } from 'lucide-react';

interface AnalysisResult {
  success: boolean;
  feedback: string;
  timestamp: string;
}

interface UploadedFile {
  name: string;
  fileId: string;
  publicUrl: string;
  directUrl: string;
}

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<Array<{id: string; content: string; fullContent: string; createdAt: string; size: number; publicUrl: string | null; directUrl: string | null; hasGoogleDriveBackup: boolean; fileName: string}>>([]);
  const [selectedInstructionId, setSelectedInstructionId] = useState<string>('');

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/instructions');
      const data = await response.json();
      if (data.success) {
        setInstructions(data.instructions);
        if (data.instructions.length > 0) {
          setSelectedInstructionId(data.instructions[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching instructions:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setUploadedFile(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedInstructionId) {
        formData.append('instructionFileId', selectedInstructionId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedFile(data.file);
        setAnalysisResult(data.analysis);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      setError('An error occurred during upload');
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <span className="text-xl font-semibold text-gray-900">File Analysis Tool</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/instructions"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Instructions
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Upload File for Analysis
            </h1>
            <p className="text-gray-600">
              Upload any file type to get AI-powered feedback and analysis. 
              The file will be uploaded to Google Drive and analyzed using Gemini AI.
            </p>
          </div>

          {/* Instruction Selection */}
          {instructions.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Analysis Instructions:
              </label>
              <select
                value={selectedInstructionId}
                onChange={(e) => setSelectedInstructionId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">No specific instructions</option>
                {instructions.map((instruction) => (
                  <option key={instruction.id} value={instruction.id}>
                    {instruction.fileName} {instruction.hasGoogleDriveBackup ? '✓ (URL Available)' : '⚠ (Local Only)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload Component */}
          <div className="mb-8">
            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 border border-red-300 rounded-md bg-red-50">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 p-4 border border-blue-300 rounded-md bg-blue-50">
              <div className="text-sm text-blue-700">
                Processing your file... This may take a few moments.
              </div>
            </div>
          )}

          {/* Uploaded File Info */}
          {uploadedFile && (
            <div className="mb-6 p-4 border border-green-300 rounded-md bg-green-50">
              <div className="text-sm text-green-700">
                <strong>File uploaded successfully:</strong> {uploadedFile.name}
                <br />
                <a 
                  href={uploadedFile.publicUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View in Google Drive
                </a>
              </div>
            </div>
          )}

          {/* Feedback Display */}
          {analysisResult && (
            <FeedbackDisplay 
              feedback={analysisResult.feedback}
              timestamp={analysisResult.timestamp}
            />
          )}
        </div>
      </main>
    </div>
  );
}
