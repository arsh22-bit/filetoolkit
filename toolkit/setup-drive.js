const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function setupGoogleDrive() {
  try {
    console.log('Setting up Google Drive integration...');
    
    // Create authentication
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

    const drive = google.drive({ version: 'v3', auth });
    
    // Create a folder for file uploads
    const folderName = 'File Analysis Tool - Uploads';
    
    console.log(`Creating folder: ${folderName}`);
    
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name',
    });

    const folderId = folder.data.id;
    console.log('\nFolder created successfully!');
    console.log(`Folder Name: ${folder.data.name}`);
    console.log(`Folder ID: ${folderId}`);
    console.log(`Folder URL: https://drive.google.com/drive/folders/${folderId}`);
    
    console.log('\n✅ Please add this to your .env.local file:');
    console.log(`GOOGLE_DRIVE_FOLDER_ID=${folderId}`);
    
    // Test creating a sample file
    console.log('\nTesting file upload...');
    const fs = require('fs');
    const path = require('path');
    
    // Create a test file
    const testContent = 'This is a test file created by the File Analysis Tool setup.';
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, testContent);
    
    const fileMetadata = {
      name: 'setup-test-file.txt',
      parents: [folderId],
    };

    const media = {
      mimeType: 'text/plain',
      body: fs.createReadStream(testFilePath),
    };

    const testFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });
    
    // Make it publicly readable
    await drive.permissions.create({
      fileId: testFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    console.log(`Test file uploaded: ${testFile.data.name}`);
    console.log(`Test file URL: https://drive.google.com/file/d/${testFile.data.id}/view`);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    console.log('\n🎉 Google Drive setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your .env.local file with the folder ID above');
    console.log('2. Run: npm run dev');
    console.log('3. Visit http://localhost:3000 to test the application');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (error.code === 403) {
      console.log('\nThis might be due to:');
      console.log('- Google Drive API not enabled in your project');
      console.log('- Service account lacking permissions');
      console.log('- Invalid credentials');
    }
    process.exit(1);
  }
}

setupGoogleDrive();
