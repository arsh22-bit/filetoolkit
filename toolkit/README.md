# File Analysis Tool

A Next.js application that uploads Excel files to Google Drive and provides AI-powered analysis using Google's Gemini API.

## Features

- **Universal File Upload**: Drag-and-drop interface for uploading ANY file type (Excel, PDF, Word, Images, etc.)
- **Google Drive Integration**: Automatic upload to Google Drive with public URL generation
- **AI Analysis**: Uses Gemini AI to analyze any file type and provide detailed feedback
- **Flexible Instruction Management**: Upload any file type as instructions to guide the AI analysis
- **Smart File Processing**: Auto-detects file types and MIME types for optimal handling
- **Multi-format Analysis**: Analyzes Excel tabs, PDF content, images, documents, and more
- **Feedback Display**: Clean, formatted display of AI analysis results

## Setup Instructions

### 1. Environment Variables

Copy the `.env.local` file and fill in your credentials:

```bash
# Google Drive API Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REFRESH_TOKEN=your_google_refresh_token_here
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id_here

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Google Drive API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create credentials (OAuth 2.0 Client ID)
5. Add `http://localhost:3000` to authorized redirect URIs
6. Generate refresh token using OAuth playground or Google's OAuth flow

### 3. Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Add the API key to your environment variables

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. **Upload Instructions** (Optional):
   - Go to `/instructions` to upload instruction files
   - These files guide how the AI analyzes your Excel files
   - Supports .txt, .md, .doc, .docx files

2. **Upload Excel Files**:
   - On the main page, select an instruction file (if any)
   - Drag and drop or click to upload your Excel file
   - The file will be uploaded to Google Drive and analyzed by Gemini AI

3. **View Results**:
   - AI analysis results are displayed immediately after processing
   - Copy feedback to clipboard using the copy button
   - View uploaded files in Google Drive using the provided links

## File Structure

- `/app/page.tsx` - Main landing page with file upload
- `/app/instructions/page.tsx` - Instruction management page
- `/components/FileUpload.tsx` - File upload component with drag-and-drop
- `/components/FeedbackDisplay.tsx` - AI feedback display component
- `/lib/googleDrive.ts` - Google Drive integration service
- `/lib/gemini.ts` - Gemini AI integration service
- `/app/api/upload/route.ts` - API endpoint for file uploads
- `/app/api/instructions/route.ts` - API endpoint for instruction management

## Security Notes

- Files are temporarily stored locally and then deleted after upload
- Google Drive files are made publicly readable
- Instruction files are stored locally and backed up to Google Drive
- Environment variables contain sensitive API keys - keep them secure

## Troubleshooting

- Ensure all environment variables are properly set
- Check Google Drive API quotas and permissions
- Verify Gemini API key is valid and has sufficient quota
- Check browser console for detailed error messages

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
