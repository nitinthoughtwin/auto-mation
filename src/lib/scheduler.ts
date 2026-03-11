import 'server-only';
import { db } from './db';
import { uploadVideo, uploadThumbnail, refreshAccessToken } from './youtube';
import fs from 'fs';
import path from 'path';

// Frequency types
type FrequencyType = 'daily' | 'alternate' | 'every3days' | 'every5days' | 'everySunday';

// Get day of week (0 = Sunday, 1 = Monday, etc.)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Check if dates are on the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Get days difference between two dates
function getDaysDifference(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Convert 12-hour time (with AM/PM) to 24-hour format
function convertTo24Hour(timeStr: string): { hours: number; minutes: number } {
  // Handle both "HH:mm" and "HH:mm AM/PM" formats
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
  }
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
}

// Check if upload should happen based on frequency and time
function shouldUpload(channel: {
  uploadTime: string;
  frequency: FrequencyType;
  lastUploadDate: Date | null;
}): { allowed: boolean; reason: string } {
  const now = new Date();
  const { hours, minutes } = convertTo24Hour(channel.uploadTime);
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // Check if current time matches upload time (within 5 minutes window)
  const scheduledMinutes = hours * 60 + minutes;
  const currentMinutesTotal = currentHours * 60 + currentMinutes;
  const timeDiff = Math.abs(currentMinutesTotal - scheduledMinutes);
  
  if (timeDiff > 5) {
    const scheduledTimeStr = formatTime12Hour(hours, minutes);
    const currentTimeStr = formatTime12Hour(currentHours, currentMinutes);
    return { 
      allowed: false, 
      reason: `Not scheduled time yet. Current: ${currentTimeStr}, Scheduled: ${scheduledTimeStr}` 
    };
  }

  const frequencyLabels: Record<FrequencyType, string> = {
    daily: 'Daily',
    alternate: 'Every 2nd Day',
    every3days: 'Every 3rd Day',
    every5days: 'Every 5th Day',
    everySunday: 'Every Sunday'
  };

  // Check based on frequency
  switch (channel.frequency) {
    case 'daily': {
      // Check if already uploaded today
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDay(lastUpload, now)) {
          return { allowed: false, reason: 'Already uploaded today. Next upload tomorrow.' };
        }
      }
      return { allowed: true, reason: 'Daily upload ready - new day' };
    }

    case 'alternate': {
      // Every 2nd day
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 2) {
          return { allowed: false, reason: `Every 2nd Day: ${daysSince} day(s) since last upload, need 2 days` };
        }
      }
      return { allowed: true, reason: 'Every 2nd Day upload ready' };
    }

    case 'every3days': {
      // Every 3rd day
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 3) {
          return { allowed: false, reason: `Every 3rd Day: ${daysSince} day(s) since last upload, need 3 days` };
        }
      }
      return { allowed: true, reason: 'Every 3rd Day upload ready' };
    }

    case 'every5days': {
      // Every 5th day
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 5) {
          return { allowed: false, reason: `Every 5th Day: ${daysSince} day(s) since last upload, need 5 days` };
        }
      }
      return { allowed: true, reason: 'Every 5th Day upload ready' };
    }

    case 'everySunday': {
      // Check if today is Sunday
      if (getDayOfWeek(now) !== 0) {
        return { allowed: false, reason: 'Every Sunday: Today is not Sunday' };
      }
      // Check if already uploaded this Sunday
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDay(lastUpload, now)) {
          return { allowed: false, reason: 'Every Sunday: Already uploaded this Sunday' };
        }
      }
      return { allowed: true, reason: 'Every Sunday upload ready' };
    }

    default:
      return { allowed: false, reason: `Unknown frequency: ${channel.frequency}` };
  }
}

// Format time in 12-hour format with AM/PM
function formatTime12Hour(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

// Calculate next upload date
export function getNextUploadDate(channel: {
  uploadTime: string;
  frequency: FrequencyType;
  lastUploadDate: Date | string | null;
}): Date {
  const now = new Date();
  const { hours, minutes } = convertTo24Hour(channel.uploadTime);
  
  // Start with today at scheduled time
  let nextUpload = new Date();
  nextUpload.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, start from tomorrow
  if (nextUpload <= now) {
    nextUpload.setDate(nextUpload.getDate() + 1);
  }

  const lastUpload = channel.lastUploadDate ? new Date(channel.lastUploadDate) : null;

  switch (channel.frequency) {
    case 'daily':
      // Already handled above - next available day at scheduled time
      if (lastUpload && isSameDay(lastUpload, now)) {
        // Already uploaded today, next is tomorrow
        nextUpload.setDate(nextUpload.getDate() + 1);
      }
      break;

    case 'alternate':
      if (lastUpload) {
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 2) {
          nextUpload = new Date(lastUpload);
          nextUpload.setDate(nextUpload.getDate() + 2);
          nextUpload.setHours(hours, minutes, 0, 0);
        }
      }
      break;

    case 'every3days':
      if (lastUpload) {
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 3) {
          nextUpload = new Date(lastUpload);
          nextUpload.setDate(nextUpload.getDate() + 3);
          nextUpload.setHours(hours, minutes, 0, 0);
        }
      }
      break;

    case 'every5days':
      if (lastUpload) {
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 5) {
          nextUpload = new Date(lastUpload);
          nextUpload.setDate(nextUpload.getDate() + 5);
          nextUpload.setHours(hours, minutes, 0, 0);
        }
      }
      break;

    case 'everySunday':
      // Find next Sunday
      const currentDay = getDayOfWeek(now);
      const daysUntilSunday = (7 - currentDay) % 7 || 7;
      nextUpload.setDate(now.getDate() + daysUntilSunday);
      nextUpload.setHours(hours, minutes, 0, 0);
      // If it's Sunday and we haven't uploaded yet today
      if (currentDay === 0 && (!lastUpload || !isSameDay(lastUpload, now))) {
        nextUpload = new Date();
        nextUpload.setHours(hours, minutes, 0, 0);
        if (nextUpload <= now) {
          // Time passed, next Sunday
          nextUpload.setDate(nextUpload.getDate() + 7);
        }
      }
      break;
  }

  return nextUpload;
}

// Main scheduler function - processes all channels
export async function processScheduledUploads(): Promise<{ 
  processed: number; 
  skipped: number; 
  results: Array<{ channel: string; status: string; message: string }> 
}> {
  console.log('Scheduler: Processing scheduled uploads...');
  
  const results: Array<{ channel: string; status: string; message: string }> = [];
  let processed = 0;
  let skipped = 0;
  
  try {
    // Get all active channels
    const channels = await db.channel.findMany({
      where: { isActive: true },
      include: {
        videos: {
          where: { status: 'queued' },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    for (const channel of channels) {
      // Check if this channel should upload now
      const uploadCheck = shouldUpload(channel as any);
      
      if (!uploadCheck.allowed) {
        console.log(`Skipping ${channel.name}: ${uploadCheck.reason}`);
        results.push({
          channel: channel.name,
          status: 'skipped',
          message: uploadCheck.reason
        });
        skipped++;
        continue;
      }

      // Check if there's a queued video
      const video = channel.videos[0];
      if (!video) {
        console.log(`No queued videos for channel: ${channel.name}`);
        results.push({
          channel: channel.name,
          status: 'skipped',
          message: 'No videos in queue'
        });
        skipped++;
        continue;
      }

      console.log(`Processing upload for channel: ${channel.name}, video: ${video.title}`);
      console.log(`Reason: ${uploadCheck.reason}`);

      try {
        // Refresh token if needed
        let accessToken = channel.accessToken;
        try {
          const tokens = await refreshAccessToken(channel.refreshToken);
          accessToken = tokens.accessToken;
          // Update tokens in database
          await db.channel.update({
            where: { id: channel.id },
            data: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            },
          });
        } catch (tokenError) {
          console.error('Failed to refresh token:', tokenError);
          // Try with existing token
        }

        // Construct file path
        const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
        const filePath = path.join(uploadDir, video.fileName);

        if (!fs.existsSync(filePath)) {
          throw new Error(`Video file not found: ${video.fileName}`);
        }

        // Upload to YouTube
        const result = await uploadVideo(accessToken, channel.refreshToken, {
          title: video.title,
          description: video.description || '',
          tags: video.tags ? video.tags.split(',').map(t => t.trim()) : [],
          filePath,
        });

        if (result.success && result.videoId) {
          // Upload thumbnail if exists
          if (video.thumbnailName) {
            const thumbnailUploadDir = path.join(process.cwd(), 'uploads', 'thumbnails');
            const thumbnailPath = path.join(thumbnailUploadDir, video.thumbnailName);
            
            if (fs.existsSync(thumbnailPath)) {
              console.log(`Uploading thumbnail for video: ${video.title}`);
              try {
                const thumbnailResult = await uploadThumbnail(
                  accessToken,
                  channel.refreshToken,
                  result.videoId,
                  thumbnailPath
                );
                
                if (thumbnailResult.success) {
                  console.log(`Thumbnail uploaded successfully`);
                } else {
                  console.error(`Thumbnail upload failed: ${thumbnailResult.error}`);
                }
              } catch (thumbError) {
                console.error('Thumbnail upload error:', thumbError);
              }
              // Delete local thumbnail file after upload attempt
              fs.unlinkSync(thumbnailPath);
            }
          }

          // Update video status
          await db.video.update({
            where: { id: video.id },
            data: {
              status: 'uploaded',
              uploadedAt: new Date(),
            },
          });

          // Update channel last upload date
          await db.channel.update({
            where: { id: channel.id },
            data: { lastUploadDate: new Date() },
          });

          // Log success
          await db.schedulerLog.create({
            data: {
              channelId: channel.id,
              videoId: video.id,
              action: 'upload',
              status: 'success',
              message: `Video uploaded successfully: ${result.videoUrl}`,
            },
          });

          // Delete local file after successful upload
          fs.unlinkSync(filePath);
          console.log(`Video uploaded successfully: ${result.videoUrl}`);
          
          results.push({
            channel: channel.name,
            status: 'success',
            message: `Uploaded: ${video.title} - ${result.videoUrl}`
          });
          processed++;
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        console.error(`Upload failed for channel ${channel.name}:`, error);

        // Update video status to failed
        await db.video.update({
          where: { id: video.id },
          data: {
            status: 'failed',
            error: error.message || 'Upload failed',
          },
        });

        // Log failure
        await db.schedulerLog.create({
          data: {
            channelId: channel.id,
            videoId: video.id,
            action: 'upload',
            status: 'failed',
            message: error.message || 'Upload failed',
          },
        });
        
        results.push({
          channel: channel.name,
          status: 'failed',
          message: error.message || 'Upload failed'
        });
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
  
  return { processed, skipped, results };
}