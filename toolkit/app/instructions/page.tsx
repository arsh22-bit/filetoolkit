'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Eye, X } from 'lucide-react';

interface Instruction {
  id: string;
  content: string;
  fullContent: string;
  createdAt: string;
  size: number;
}

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingInstruction, setViewingInstruction] = useState<Instruction | null>(null);

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/instructions');
      const data = await response.json();
      if (data.success) {
        setInstructions(data.instructions);
      }
    } catch (error) {
      console.error('Error fetching instructions:', error);
      setError('Failed to fetch instructions');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const uploadInstruction = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('instruction', selectedFile);

      const response = await fetch('/api/instructions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Instruction file uploaded successfully!');
        setSelectedFile(null);
        fetchInstructions();
        const fileInput = document.getElementById('instruction-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      setError('An error occurred during upload');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-800" />
              </Link>
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <span className="text-xl font-semibold text-gray-900">Instruction Management</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Manage Analysis Instructions
            </h1>
            <p className="text-gray-600">
              Upload instruction files that will guide the AI analysis of your uploaded files.
              Supports any file type - text files are preferred for instructions.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upload New Instructions</h2>
            
            <div className="flex items-center space-x-4">
              <input
                id="instruction-upload"
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={uploadInstruction}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {selectedFile && (
              <div className="mt-4 text-sm text-gray-600">
                Selected: <span className="font-medium">{selectedFile.name}</span> 
                ({formatFileSize(selectedFile.size)})
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 border border-red-300 rounded-md bg-red-50">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border border-green-300 rounded-md bg-green-50">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Uploaded Instructions</h2>
            </div>
            
            {instructions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No instruction files uploaded yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Upload your first instruction file to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {instructions.map((instruction) => (
                  <div key={instruction.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Instruction {instruction.id.replace('instruction_', '')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(instruction.createdAt)} • {formatFileSize(instruction.size)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {instruction.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setViewingInstruction(instruction)}
                          className="p-2 text-gray-400 hover:text-blue-600 focus:outline-none"
                          title="View full content"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {viewingInstruction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Instruction Details
              </h3>
              <button
                onClick={() => setViewingInstruction(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Created: {formatDate(viewingInstruction.createdAt)} • 
                Size: {formatFileSize(viewingInstruction.size)}
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                {viewingInstruction.fullContent}
              </pre>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewingInstruction(null)}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
