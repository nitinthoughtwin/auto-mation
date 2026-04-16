// Shared utilities that can run on both client and server

// Get next upload time for a channel
export function getNextUploadTime(channel: {
    uploadTime: string;
    frequency: string;
    lastUploadDate: Date | string | null;
  }): Date {
    const now = new Date();
    const [hours, minutes] = channel.uploadTime.split(':').map(Number);

    // Helper: next upload = lastUploadDate + N days (if still in the future)
    const nextFromLast = (days: number): Date | null => {
      if (!channel.lastUploadDate) return null;
      const last = new Date(channel.lastUploadDate);
      const next = new Date(last);
      next.setDate(next.getDate() + days);
      next.setHours(hours, minutes, 0, 0);
      return next > now ? next : null;
    };

    // Helper: today at uploadTime, or tomorrow if passed
    const nextDaily = (): Date => {
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    };

    switch (channel.frequency) {
      case 'daily':
        return nextDaily();

      case 'alternate':
        return nextFromLast(2) ?? nextDaily();

      case 'every3days':
        return nextFromLast(3) ?? nextDaily();

      case 'every5days':
        return nextFromLast(5) ?? nextDaily();

      case 'everySunday': {
        const dayOfWeek = now.getDay(); // 0 = Sunday
        if (dayOfWeek === 0) {
          // Today is Sunday — check if upload time is still ahead
          const todaySlot = new Date();
          todaySlot.setHours(hours, minutes, 0, 0);
          if (todaySlot > now) return todaySlot;
        }
        // Next Sunday
        const daysUntil = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
        const nextSunday = new Date();
        nextSunday.setDate(now.getDate() + daysUntil);
        nextSunday.setHours(hours, minutes, 0, 0);
        return nextSunday;
      }

      default:
        return nextDaily();
    }
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
  