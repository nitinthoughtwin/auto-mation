import 'server-only';
import { db } from './db';
import { uploadVideo, refreshAccessToken } from './youtube';

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
  frequency: string;
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
    const scheduledTimeStr = `${hours}:${minutes.toString().padStart(2, '0')}`;
    const currentTimeStr = `${currentHours}:${currentMinutes.toString().padStart(2, '0')}`;
    return { 
      allowed: false, 
      reason: `Not scheduled time. Current: ${currentTimeStr}, Scheduled: ${scheduledTimeStr}` 
    };
  }

  // Check based on frequency
  switch (channel.frequency) {
    case 'daily': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDay(lastUpload, now)) {
          return { allowed: false, reason: 'Already uploaded today' };
        }
      }
      return { allowed: true, reason: 'Daily upload ready' };
    }

    case 'alternate': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 2) {
          return { allowed: false, reason: `Need 2 days, only ${daysSince} passed` };
        }
      }
      return { allowed: true, reason: 'Every 2nd day ready' };
    }

    case 'every3days': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 3) {
          return { allowed: false, reason: `Need 3 days, only ${daysSince} passed` };
        }
      }
      return { allowed: true, reason: 'Every 3rd day ready' };
    }

    case 'every5days': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, now);
        if (daysSince < 5) {
          return { allowed: false, reason: `Need 5 days, only ${daysSince} passed` };
        }
      }
      return { allowed: true, reason: 'Every 5th day ready' };
    }

    case 'everySunday': {
      if (getDayOfWeek(now) !== 0) {
        return { allowed: false, reason: 'Not Sunday' };
      }
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDay(lastUpload, now)) {
          return { allowed: false, reason: 'Already uploaded this Sunday' };
        }
      }
      return { allowed: true, reason: 'Sunday upload ready' };
    }

    default:
      return { allowed: false, reason: `Unknown frequency: ${channel.frequency}` };
  }
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
    // Get all active channels with queued videos
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

    console.log(`Found ${channels.length} active channels`);

    for (const channel of channels) {
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

      const video = channel.videos[0];
      if (!video) {
        console.log(`No queued videos for channel: ${channel.name}`);
        results.push({
          channel: channel.name,
          status: 'skipped',
          message: 'No queued videos'
        });
        skipped++;
        continue;
      }

      console.log(`Processing: ${channel.name}, video: ${video.title}`);

      try {
        // Refresh token if needed
        let accessToken = channel.accessToken;
        try {
          const tokens = await refreshAccessToken(channel.refreshToken);
          accessToken = tokens.accessToken;
          await db.channel.update({
            where: { id: channel.id },
            data: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            },
          });
        } catch (tokenError) {
          console.error('Token refresh failed, trying existing token:', tokenError);
        }

        // Check if fileName is a URL (from Blob storage)
        const isBlobUrl = video.fileName.startsWith('http://') || video.fileName.startsWith('https://');
        
        let videoBuffer: Buffer;
        
        if (isBlobUrl) {
          // Download from Blob URL
          console.log(`Downloading from Blob: ${video.fileName}`);
          const response = await fetch(video.fileName);
          if (!response.ok) {
            throw new Error(`Failed to download video from Blob: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          videoBuffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error('Local file storage not supported. Video must be in Blob storage.');
        }

        // Upload to YouTube
        const result = await uploadVideo(accessToken, channel.refreshToken, {
          title: video.title,
          description: video.description || '',
          tags: video.tags ? video.tags.split(',').map(t => t.trim()) : [],
          fileBuffer: videoBuffer,
          fileName: video.originalName || 'video.mp4',
        });

        if (result.success) {
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
              message: `Video uploaded: ${result.videoUrl}`,
            },
          });

          console.log(`✅ Uploaded: ${result.videoUrl}`);
          
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
        console.error(`❌ Upload failed for ${channel.name}:`, error);

        await db.video.update({
          where: { id: video.id },
          data: {
            status: 'failed',
            error: error.message || 'Upload failed',
          },
        });

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