'use client';

import { useState } from 'react';
import { MessageSquare, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FeedbackDisplayProps {
  feedback: string;
  timestamp: string;
}

export default function FeedbackDisplay({ feedback, timestamp }: FeedbackDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(feedback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              AI Analysis Results
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {formatTimestamp(timestamp)}
            </span>
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
              title="Copy feedback"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4">
        <div className="markdown-content">
          <ReactMarkdown>{feedback}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
