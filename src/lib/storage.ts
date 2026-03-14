import 'server-only';
import { 
  deleteFromGoogleDrive, 
  extractFileIdFromUrl 
} from './google-drive';

interface DeleteOptions {
  accessToken: string;
  refreshToken: string;
}

/**
 * Delete a file from storage (Google Drive)
 * Handles both file IDs and URLs
 */
export async function deleteFile(
  fileUrlOrId: string,
  options: DeleteOptions
): Promise<void> {
  // Extract file ID from URL if needed
  const fileId = extractFileIdFromUrl(fileUrlOrId) || fileUrlOrId;
  
  if (!fileId || fileId.length < 10) {
    console.log('[Storage] Invalid file ID, skipping delete:', fileUrlOrId);
    return;
  }
  
  try {
    // Delete from Google Drive
    await deleteFromGoogleDrive(options.accessToken, options.refreshToken, fileId);
    console.log('[Storage] File deleted:', fileId);
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    // Don't throw - deletion is not critical
  }
}
