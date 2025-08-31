import { google } from 'googleapis';
import { drive_v3 } from 'googleapis';
import fs from 'fs';

class GoogleDriveService {
  private drive: drive_v3.Drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      // Excel files
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      // Word files
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      // PDF
      'pdf': 'application/pdf',
      // Text files
      'txt': 'text/plain',
      'md': 'text/markdown',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      // Other formats
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  async uploadFile(filePath: string, fileName: string, fileType?: string) {
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
      
      const fileMetadata: {
        name: string;
        driveId?: string;
        parents?: string[];
      } = {
        name: fileName,
      };

      // If using shared drive, specify the drive ID instead of parents
      if (sharedDriveId) {
        fileMetadata.driveId = sharedDriveId;
        fileMetadata.parents = folderId ? [folderId] : undefined;
      } else if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: fileType || this.getMimeType(fileName),
        body: fs.createReadStream(filePath),
      };

      const createParams: {
        requestBody: typeof fileMetadata;
        media: typeof media;
        fields: string;
        supportsAllDrives?: boolean;
      } = {
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      };

      // If using shared drive, add the supportsAllDrives parameter
      if (sharedDriveId) {
        createParams.supportsAllDrives = true;
      }

      const response = await this.drive.files.create(createParams);

      const fileId = response.data.id;

      // Make the file publicly accessible
      if (fileId) {
        const permissionParams: {
          fileId: string;
          requestBody: {
            role: string;
            type: string;
          };
          supportsAllDrives?: boolean;
        } = {
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        };

        // If using shared drive, add the supportsAllDrives parameter
        if (sharedDriveId) {
          permissionParams.supportsAllDrives = true;
        }

        await this.drive.permissions.create(permissionParams);
      }

      // Get the public URL
      const publicUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const directUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

      return {
        fileId,
        publicUrl,
        directUrl,
        success: true,
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      
      // Check if this is the specific service account storage quota error
      if (error instanceof Error && error.message.includes('Service Accounts do not have storage quota')) {
        console.warn('Google Drive upload failed: Service account needs shared drive or OAuth delegation');
        console.warn('To fix this, either:');
        console.warn('1. Set up a shared drive and set GOOGLE_SHARED_DRIVE_ID environment variable');
        console.warn('2. Use OAuth delegation instead of service account');
        console.warn('3. Upload files directly to a shared drive the service account has access to');
        
        // Return a fallback response instead of throwing
        return {
          fileId: null,
          publicUrl: null,
          directUrl: null,
          success: false,
          error: 'Service account requires shared drive or OAuth delegation',
        };
      }
      
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  async deleteFile(fileId: string) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  async listFiles(folderId?: string) {
    try {
      const query = folderId ? `'${folderId}' in parents` : undefined;
      
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, createdTime, mimeType)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing files from Google Drive:', error);
      throw new Error('Failed to list files from Google Drive');
    }
  }
}

export default GoogleDriveService;
