'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Eye, X, Download, Star, MessageSquare, Edit3, Trash2, Edit, CheckSquare, RefreshCw } from 'lucide-react';

interface PMPChecklistItem {
  srNo: number;
  checklist: string;
  compliance: string;
  remark: string;
}

interface Instruction {
  id: string;
  content: string;
  fullContent: string;
  createdAt: string;
  size: number;
  specialInstruction?: string;
  isPMPA?: boolean;
  feedback?: string;
  inputData?: Record<string, string>;
  customPrompt?: string;
  fileName?: string;
  pmpChecklist?: PMPChecklistItem[];
}

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingInstruction, setViewingInstruction] = useState<Instruction | null>(null);
  const [pmpFeedback, setPmpFeedback] = useState<string>('');
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [newFieldValue, setNewFieldValue] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('content');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editCustomPrompt, setEditCustomPrompt] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState<string | null>(null);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState<string | null>(null);

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
      if (customPrompt.trim()) {
        formData.append('customPrompt', customPrompt.trim());
      }

      const response = await fetch('/api/instructions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Instruction file uploaded successfully!');
        setSelectedFile(null);
        setCustomPrompt('');
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

  const downloadInstruction = (instruction: Instruction) => {
    const content = JSON.stringify({
      id: instruction.id,
      content: instruction.fullContent,
      specialInstruction: instruction.specialInstruction,
      isPMPA: instruction.isPMPA,
      feedback: instruction.feedback,
      inputData: instruction.inputData,
      customPrompt: instruction.customPrompt,
      createdAt: instruction.createdAt,
      size: instruction.size
    }, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instruction_${instruction.id.replace('instruction_', '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updatePmpFeedback = async (instructionId: string, feedback: string) => {
    try {
      const response = await fetch('/api/instructions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: instructionId,
          feedback: feedback,
        }),
      });
      
      if (response.ok) {
        setSuccess('Feedback updated successfully!');
        fetchInstructions();
      } else {
        setError('Failed to update feedback');
      }
    } catch (error) {
      setError('Error updating feedback');
      console.error('Update error:', error);
    }
  };

  const updatePmpInputData = async (instructionId: string, inputData: Record<string, string>) => {
    try {
      const response = await fetch('/api/instructions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: instructionId,
          inputData: inputData,
        }),
      });
      
      if (response.ok) {
        setSuccess('Input data updated successfully!');
        fetchInstructions();
      } else {
        setError('Failed to update input data');
      }
    } catch (error) {
      setError('Error updating input data');
      console.error('Update error:', error);
    }
  };

  const deleteInstruction = async (instructionId: string) => {
    if (!window.confirm('Are you sure you want to delete this instruction? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(instructionId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/instructions?id=${instructionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Instruction deleted successfully!');
        fetchInstructions();
        // Close modal if viewing the deleted instruction
        if (viewingInstruction?.id === instructionId) {
          setViewingInstruction(null);
        }
      } else {
        setError(data.error || 'Failed to delete instruction');
      }
    } catch (error) {
      setError('An error occurred while deleting the instruction');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const startEditInstruction = (instruction: Instruction) => {
    setEditingInstruction(instruction);
    setEditContent(instruction.fullContent);
    setEditCustomPrompt(instruction.customPrompt || '');
    setActiveTab('edit');
  };

  const saveEditInstruction = async () => {
    if (!editingInstruction) return;

    setIsEditing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/instructions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingInstruction.id,
          content: editContent,
          customPrompt: editCustomPrompt.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Instruction updated successfully!');
        setEditingInstruction(null);
        setEditContent('');
        setEditCustomPrompt('');
        setActiveTab('content');
        fetchInstructions();
        
        // Update viewing instruction if it's the same one
        if (viewingInstruction?.id === editingInstruction.id) {
          setViewingInstruction(data.instruction);
        }
      } else {
        setError(data.error || 'Failed to update instruction');
      }
    } catch (error) {
      setError('An error occurred while updating the instruction');
      console.error('Update error:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const cancelEdit = () => {
    setEditingInstruction(null);
    setEditContent('');
    setEditCustomPrompt('');
    setActiveTab('content');
  };

  const generateAIFeedback = async (instructionId: string) => {
    setIsGeneratingFeedback(instructionId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/instructions/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructionId: instructionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('AI feedback generated successfully!');
        fetchInstructions();
        
        // Update viewing instruction if it's the same one
        if (viewingInstruction?.id === instructionId) {
          setViewingInstruction(data.instruction);
        }
      } else {
        setError(data.error || 'Failed to generate feedback');
      }
    } catch (error) {
      setError('An error occurred while generating feedback');
      console.error('Generate feedback error:', error);
    } finally {
      setIsGeneratingFeedback(null);
    }
  };

  const generatePMPChecklist = async (instructionId: string) => {
    setIsGeneratingChecklist(instructionId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/instructions/fill-pmp-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructionId: instructionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('PMP-A checklist generated successfully!');
        fetchInstructions();
        
        // Update viewing instruction if it's the same one
        if (viewingInstruction?.id === instructionId) {
          setViewingInstruction(data.instruction);
        }
      } else {
        setError(data.error || 'Failed to generate PMP-A checklist');
      }
    } catch (error) {
      setError('An error occurred while generating the PMP-A checklist');
      console.error('Generate PMP checklist error:', error);
    } finally {
      setIsGeneratingChecklist(null);
    }
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
              <div className="mt-4 space-y-3">
                <div className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{selectedFile.name}</span> 
                  ({formatFileSize(selectedFile.size)})
                </div>
                <div>
                  <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Special Analysis Instructions (Optional)
                  </label>
                  <textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Add specific instructions for AI analysis (e.g., focus on specific metrics, compare with standards, etc.)"
                    className="w-full h-20 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    These instructions will be included in the AI analysis prompt to provide more targeted analysis.
                  </p>
                </div>
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
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                Instruction {instruction.id.replace('instruction_', '')}
                              </p>
                              {instruction.isPMPA && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  PMP-A
                                </span>
                              )}
                              {instruction.specialInstruction && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  Special
                                </span>
                              )}
                              {instruction.customPrompt && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatDate(instruction.createdAt)} • {formatFileSize(instruction.size)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {instruction.content}
                          </p>
                          {instruction.specialInstruction && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-700 font-medium">Special Instruction:</p>
                              <p className="text-xs text-yellow-600 line-clamp-1">
                                {instruction.specialInstruction}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => downloadInstruction(instruction)}
                          className="p-2 text-gray-400 hover:text-green-600 focus:outline-none"
                          title="Download instruction details"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setViewingInstruction(instruction);
                            startEditInstruction(instruction);
                          }}
                          className="p-2 text-gray-400 hover:text-orange-600 focus:outline-none"
                          title="Edit instruction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewingInstruction(instruction)}
                          className="p-2 text-gray-400 hover:text-blue-600 focus:outline-none"
                          title="View full content"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteInstruction(instruction.id)}
                          disabled={isDeleting === instruction.id}
                          className="p-2 text-gray-400 hover:text-red-600 focus:outline-none disabled:opacity-50"
                          title="Delete instruction"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Instruction Details
                </h3>
                {viewingInstruction.isPMPA && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    PMP-A File
                  </span>
                )}
                {viewingInstruction.specialInstruction && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    Special Instructions
                  </span>
                )}
                {viewingInstruction.customPrompt && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Custom Prompt
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadInstruction(viewingInstruction)}
                  className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none flex items-center"
                  title="Download instruction details"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={() => setViewingInstruction(null)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Created: {formatDate(viewingInstruction.createdAt)} • 
                Size: {formatFileSize(viewingInstruction.size)}
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'content'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-1" />
                  Content
                </button>
                <button
                  onClick={() => {
                    if (!editingInstruction) {
                      startEditInstruction(viewingInstruction);
                    } else {
                      setActiveTab('edit');
                    }
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'edit'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Edit className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                {viewingInstruction.specialInstruction && (
                  <button
                    onClick={() => setActiveTab('special')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'special'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Star className="h-4 w-4 inline mr-1" />
                    Special Instructions
                  </button>
                )}
                {viewingInstruction.customPrompt && (
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'custom'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Edit3 className="h-4 w-4 inline mr-1" />
                    Custom Prompt
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'feedback'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Feedback
                </button>
                {viewingInstruction.isPMPA && (
                  <button
                    onClick={() => setActiveTab('input')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'input'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Edit3 className="h-4 w-4 inline mr-1" />
                    Input Data
                  </button>
                )}
                {viewingInstruction.isPMPA && (
                  <button
                    onClick={() => setActiveTab('checklist')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'checklist'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CheckSquare className="h-4 w-4 inline mr-1" />
                    PMP Checklist
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'content' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">
                    {viewingInstruction.fullContent}
                  </pre>
                </div>
              )}

              {activeTab === 'special' && viewingInstruction.specialInstruction && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Special Instructions</h4>
                  <div className="bg-white border border-yellow-200 rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">
                      {viewingInstruction.specialInstruction}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'custom' && viewingInstruction.customPrompt && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Custom Analysis Prompt</h4>
                  <div className="bg-white border border-blue-200 rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">
                      {viewingInstruction.customPrompt}
                    </pre>
                  </div>
                  <p className="mt-2 text-xs text-blue-600">
                    This custom prompt will be included when analyzing files to provide more targeted analysis.
                  </p>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-purple-800">
                        {viewingInstruction.isPMPA ? 'PMP-A File Feedback' : 'Instruction Feedback'}
                      </h4>
                      {(!viewingInstruction.feedback || !viewingInstruction.feedback.trim()) && (
                        <button
                          onClick={() => generateAIFeedback(viewingInstruction.id)}
                          disabled={isGeneratingFeedback === viewingInstruction.id}
                          className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {isGeneratingFeedback === viewingInstruction.id ? 'Generating...' : 'Generate AI Feedback'}
                        </button>
                      )}
                    </div>
                    
                    {viewingInstruction.feedback && viewingInstruction.feedback.trim() ? (
                      <div className="space-y-3">
                        <div className="bg-white border border-purple-200 rounded p-3 max-h-60 overflow-y-auto">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {viewingInstruction.feedback}
                          </p>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => generateAIFeedback(viewingInstruction.id)}
                            disabled={isGeneratingFeedback === viewingInstruction.id}
                            className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {isGeneratingFeedback === viewingInstruction.id ? 'Regenerating...' : 'Regenerate AI Feedback'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-white border border-purple-200 rounded p-3">
                          <div className="text-center py-8">
                            <MessageSquare className="mx-auto h-8 w-8 text-purple-400 mb-3" />
                            <p className="text-sm text-purple-600 mb-4">No feedback available yet</p>
                            <p className="text-xs text-purple-500 mb-4">
                              {viewingInstruction.isPMPA 
                                ? 'Generate AI-powered feedback based on PMP-A standards and best practices'
                                : 'Generate AI-powered feedback to analyze and improve this instruction'}
                            </p>
                            <button
                              onClick={() => generateAIFeedback(viewingInstruction.id)}
                              disabled={isGeneratingFeedback === viewingInstruction.id}
                              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center mx-auto"
                            >
                              <Star className="h-4 w-4 mr-2" />
                              {isGeneratingFeedback === viewingInstruction.id ? 'Generating Feedback...' : 'Generate AI Feedback'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-purple-200 rounded p-3">
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Or add manual feedback:</h5>
                          <textarea
                            value={pmpFeedback}
                            onChange={(e) => setPmpFeedback(e.target.value)}
                            placeholder={`Enter manual feedback for this ${viewingInstruction.isPMPA ? 'PMP-A file' : 'instruction'}...`}
                            className="w-full h-32 text-sm text-gray-800 border-0 resize-none focus:outline-none"
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                updatePmpFeedback(viewingInstruction.id, pmpFeedback);
                                setPmpFeedback('');
                              }}
                              disabled={!pmpFeedback.trim()}
                              className="px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                              Save Manual Feedback
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'edit' && editingInstruction && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-800 mb-4">Edit Instruction</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Instruction Content
                        </label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-48 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none placeholder-gray-500"
                          placeholder="Enter the instruction content..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Analysis Prompt (Optional)
                        </label>
                        <textarea
                          value={editCustomPrompt}
                          onChange={(e) => setEditCustomPrompt(e.target.value)}
                          className="w-full h-20 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none placeholder-gray-500"
                          placeholder="Add specific instructions for AI analysis (e.g., focus on specific metrics, compare with standards, etc.)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          These instructions will be included in the AI analysis prompt to provide more targeted analysis.
                        </p>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEditInstruction}
                          disabled={isEditing || !editContent.trim()}
                          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none disabled:opacity-50 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {isEditing ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'input' && viewingInstruction.isPMPA && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-800 mb-2">PMP-A Input Data</h4>
                    <div className="space-y-3">
                      {Object.entries(viewingInstruction.inputData || {}).length > 0 ? (
                        <div className="bg-white border border-purple-200 rounded p-3">
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Existing Data:</h5>
                          {Object.entries(viewingInstruction.inputData || {}).map(([key, value]) => (
                            <div key={key} className="mb-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">{key}:</label>
                              <p className="text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded">{value}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      
                      <div className="bg-white border border-purple-200 rounded p-3">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Add New Input:</h5>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Field name"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="text"
                            placeholder="Field value"
                            value={newFieldValue}
                            onChange={(e) => setNewFieldValue(e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => {
                              if (newFieldName.trim() && newFieldValue.trim()) {
                                const newInputData = {
                                  ...viewingInstruction.inputData,
                                  [newFieldName]: newFieldValue
                                };
                                updatePmpInputData(viewingInstruction.id, newInputData);
                                setNewFieldName('');
                                setNewFieldValue('');
                              }
                            }}
                            disabled={!newFieldName.trim() || !newFieldValue.trim()}
                            className="px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            Add Field
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'checklist' && viewingInstruction.isPMPA && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-green-800">PMP-A Compliance Checklist</h4>
                      {(!viewingInstruction.pmpChecklist || viewingInstruction.pmpChecklist.length === 0) && (
                        <button
                          onClick={() => generatePMPChecklist(viewingInstruction.id)}
                          disabled={isGeneratingChecklist === viewingInstruction.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
                        >
                          <CheckSquare className="h-3 w-3 mr-1" />
                          {isGeneratingChecklist === viewingInstruction.id ? 'Generating...' : 'Generate AI Checklist'}
                        </button>
                      )}
                    </div>
                    
                    {viewingInstruction.pmpChecklist && viewingInstruction.pmpChecklist.length > 0 ? (
                      <div className="space-y-3">
                        <div className="bg-white border border-green-200 rounded p-3">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sr No.
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Checklist Item
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Compliance
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Remark
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {viewingInstruction.pmpChecklist.map((item) => (
                                  <tr key={item.srNo}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.srNo}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      <div className="max-w-xs">
                                        {item.checklist}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        item.compliance === 'Yes' ? 'bg-green-100 text-green-800' :
                                        item.compliance === 'No' ? 'bg-red-100 text-red-800' :
                                        item.compliance === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {item.compliance}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      <div className="max-w-sm">
                                        {item.remark}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => generatePMPChecklist(viewingInstruction.id)}
                            disabled={isGeneratingChecklist === viewingInstruction.id}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {isGeneratingChecklist === viewingInstruction.id ? 'Regenerating...' : 'Regenerate Checklist'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-green-200 rounded p-3">
                        <div className="text-center py-8">
                          <CheckSquare className="mx-auto h-8 w-8 text-green-400 mb-3" />
                          <p className="text-sm text-green-600 mb-4">No PMP-A checklist available yet</p>
                          <p className="text-xs text-green-500 mb-4">
                            Generate an AI-powered compliance checklist that analyzes the PMP-A content against standard requirements
                          </p>
                          <button
                            onClick={() => generatePMPChecklist(viewingInstruction.id)}
                            disabled={isGeneratingChecklist === viewingInstruction.id}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center mx-auto"
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            {isGeneratingChecklist === viewingInstruction.id ? 'Generating Checklist...' : 'Generate AI Checklist'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadInstruction(viewingInstruction)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => {
                    if (!editingInstruction) {
                      startEditInstruction(viewingInstruction);
                    } else {
                      setActiveTab('edit');
                    }
                  }}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    deleteInstruction(viewingInstruction.id);
                  }}
                  disabled={isDeleting === viewingInstruction.id}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting === viewingInstruction.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              <button
                onClick={() => {
                  if (editingInstruction) {
                    cancelEdit();
                  }
                  setViewingInstruction(null);
                }}
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
