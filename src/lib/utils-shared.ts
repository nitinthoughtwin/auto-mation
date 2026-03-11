// Shared utilities that can run on both client and server

// Get next upload time for a channel
export function getNextUploadTime(channel: {
    uploadTime: string;
    frequency: string;
    lastUploadDate: Date | string | null;
  }): Date {
    const now = new Date();
    const [hours, minutes] = channel.uploadTime.split(':').map(Number);
    
    let nextUpload = new Date();
    nextUpload.setHours(hours, minutes, 0, 0);
  
    // If time has passed today, schedule for tomorrow
    if (nextUpload <= now) {
      nextUpload.setDate(nextUpload.getDate() + 1);
    }
  
    // For alternate frequency, check last upload
    if (channel.frequency === 'alternate' && channel.lastUploadDate) {
      const lastUpload = new Date(channel.lastUploadDate);
      const daysSinceLastUpload = Math.floor(
        (now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastUpload < 2) {
        // Schedule for 2 days after last upload
        nextUpload = new Date(lastUpload);
        nextUpload.setDate(nextUpload.getDate() + 2);
        nextUpload.setHours(hours, minutes, 0, 0);
      }
    }
  
    return nextUpload;
  }
  
  // Format file size
  export function formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  }
  
  // Format date
  export function formatDate(dateStr: string | Date | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  }
  
  // Format next upload time
  export function formatNextUpload(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) return 'Pending...';
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }
    return `In ${hours}h ${minutes}m`;
  }
  