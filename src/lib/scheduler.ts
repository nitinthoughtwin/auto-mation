import 'server-only';
import { db } from './db';
import { uploadVideo, refreshAccessToken } from './youtube';
import { deleteFile } from './storage';
import { downloadFromGoogleDrive, extractFileIdFromUrl } from './google-drive';

type FrequencyType = 'daily' | 'alternate' | 'every3days' | 'every5days' | 'everySunday';

// In-memory random delay cache (persists for the day)
const randomDelayCache = new Map<string, { delay: number; date: string }>();

// Get or create random delay for the day (in minutes, -15 to +15)
function getRandomDelay(channelId: string, timezone: string): number {
  const now = new Date();
  
  // Get today's date in the channel's timezone
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = dateFormatter.format(now);
  
  // Check cache
  const cached = randomDelayCache.get(channelId);
  if (cached && cached.date === todayStr) {
    console.log(`[RandomDelay] Using cached delay: ${cached.delay} minutes`);
    return cached.delay;
  }
  
  // Generate new random delay between -15 and +15 minutes
  const delay = Math.floor(Math.random() * 31) - 15; // -15 to +15
  
  // Save to cache
  randomDelayCache.set(channelId, { delay, date: todayStr });
  
  console.log(`[RandomDelay] New delay calculated: ${delay} minutes for channel ${channelId}`);
  return delay;
}

// Get current time in a specific timezone
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; date: Date } {
  const now = new Date();
  
  // Format time in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  const timeStr = formatter.format(now);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Get date in target timezone
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = dateFormatter.format(now);
  
  return { hours, minutes, date: new Date(dateStr) };
}

// Get day of week in specific timezone (0 = Sunday, 1 = Monday, etc.)
function getDayOfWeekInTimezone(timezone: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  
  return dayMap[formatter.format(now)] ?? now.getDay();
}

// Check if dates are on the same day in a specific timezone
function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date1) === formatter.format(date2);
}

// Get days difference between two dates
function getDaysDifference(date1: Date, date2: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const d1 = new Date(formatter.format(date1));
  const d2 = new Date(formatter.format(date2));
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

// Check if upload should happen based on frequency, time, and random delay
function shouldUpload(channel: {
  id: string;
  uploadTime: string;
  frequency: string;
  timezone: string;
  lastUploadDate: Date | null;
}): { allowed: boolean; reason: string; debugInfo: Record<string, any> } {
  
  const timezone = channel.timezone || 'Asia/Kolkata';
  const { hours: currentHours, minutes: currentMinutes } = getCurrentTimeInTimezone(timezone);
  const { hours: scheduledHours, minutes: scheduledMinutes } = convertTo24Hour(channel.uploadTime);
  
  // Get random delay for today (from memory cache)
  const randomDelay = getRandomDelay(channel.id, timezone);
  
  // Calculate actual upload time with random delay
  let actualMinutesTotal = scheduledHours * 60 + scheduledMinutes + randomDelay;
  
  // Handle overflow/underflow
  let actualHours = Math.floor(actualMinutesTotal / 60) % 24;
  let actualMinutes = actualMinutesTotal % 60;
  if (actualMinutes < 0) {
    actualMinutes += 60;
    actualHours = (actualHours - 1 + 24) % 24;
  }
  if (actualHours < 0) {
    actualHours += 24;
  }
  
  // Calculate time difference in minutes
  const scheduledMinutesTotal = actualHours * 60 + actualMinutes;
  const currentMinutesTotal = currentHours * 60 + currentMinutes;
  const timeDiff = Math.abs(currentMinutesTotal - scheduledMinutesTotal);
  
  const actualTimeStr = `${String(actualHours).padStart(2, '0')}:${String(actualMinutes).padStart(2, '0')}`;
  const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
  const scheduledTimeStr = `${String(scheduledHours).padStart(2, '0')}:${String(scheduledMinutes).padStart(2, '0')}`;
  
  const debugInfo = {
    timezone,
    serverTime: new Date().toISOString(),
    currentTimeInTimezone: currentTimeStr,
    scheduledTime: scheduledTimeStr,
    randomDelayMinutes: randomDelay,
    actualUploadTime: actualTimeStr,
    timeDifferenceMinutes: timeDiff,
  };
  
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  
  // Check if current time matches upload time (within 5 minutes window)
  if (timeDiff > 5) {
    return { 
      allowed: false, 
      reason: `Not scheduled time. Current: ${currentTimeStr}, Scheduled (with delay): ${actualTimeStr} (random ${randomDelay >= 0 ? '+' : ''}${randomDelay} min)`,
      debugInfo
    };
  }

  // Check based on frequency
  switch (channel.frequency) {
    case 'daily': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDayInTimezone(lastUpload, new Date(), timezone)) {
          return { allowed: false, reason: 'Already uploaded today', debugInfo };
        }
      }
      return { allowed: true, reason: `Daily upload ready (actual time: ${actualTimeStr})`, debugInfo };
    }

    case 'alternate': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), timezone);
        if (daysSince < 2) {
          return { allowed: false, reason: `Need 2 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Every 2nd day ready', debugInfo };
    }

    case 'every3days': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), timezone);
        if (daysSince < 3) {
          return { allowed: false, reason: `Need 3 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Every 3rd day ready', debugInfo };
    }

    case 'every5days': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), timezone);
        if (daysSince < 5) {
          return { allowed: false, reason: `Need 5 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Every 5th day ready', debugInfo };
    }

    case 'everySunday': {
      if (getDayOfWeekInTimezone(timezone) !== 0) {
        return { allowed: false, reason: 'Not Sunday', debugInfo };
      }
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDayInTimezone(lastUpload, new Date(), timezone)) {
          return { allowed: false, reason: 'Already uploaded this Sunday', debugInfo };
        }
      }
      return { allowed: true, reason: 'Sunday upload ready', debugInfo };
    }

    default:
      return { allowed: false, reason: `Unknown frequency: ${channel.frequency}`, debugInfo };
  }
}

// Main scheduler function - processes all channels
export async function processScheduledUploads(): Promise<{ 
  processed: number; 
  skipped: number; 
  results: Array<{ channel: string; status: string; message: string; debugInfo?: Record<string, any> }> 
}> {
  console.log('========== Scheduler Started ==========');
  console.log('Server time (UTC):', new Date().toISOString());
  
  const results: Array<{ channel: string; status: string; message: string; debugInfo?: Record<string, any> }> = [];
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

    if (channels.length === 0) {
      results.push({
        channel: 'SYSTEM',
        status: 'info',
        message: 'No active channels found'
      });
    }

    for (const channel of channels) {
      console.log(`\n--- Processing channel: ${channel.name} ---`);
      console.log(`Channel settings: uploadTime=${channel.uploadTime}, frequency=${channel.frequency}, timezone=${channel.timezone || 'Asia/Kolkata (default)'}`);
      
      const uploadCheck = shouldUpload({
        id: channel.id,
        uploadTime: channel.uploadTime,
        frequency: channel.frequency,
        timezone: channel.timezone || 'Asia/Kolkata',
        lastUploadDate: channel.lastUploadDate,
      });
      
      console.log(`Upload check result:`, uploadCheck);
      
      if (!uploadCheck.allowed) {
        console.log(`Skipping ${channel.name}: ${uploadCheck.reason}`);
        results.push({
          channel: channel.name,
          status: 'skipped',
          message: uploadCheck.reason,
          debugInfo: uploadCheck.debugInfo,
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
      console.log(`Video fileName: ${video.fileName}`);

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
          console.log('Token refreshed successfully');
        } catch (tokenError) {
          console.error('Token refresh failed, trying existing token:', tokenError);
        }

        // Determine how to download the video
        const isUrl = video.fileName.startsWith('http://') || video.fileName.startsWith('https://');
        
        let videoBuffer: Buffer;
        
        if (isUrl) {
          // Download from URL (Google Drive public URL)
          console.log(`Downloading video from URL: ${video.fileName}`);
          const response = await fetch(video.fileName);
          if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          videoBuffer = Buffer.from(arrayBuffer);
        } else {
          // It's a Google Drive file ID - download using API
          const fileId = extractFileIdFromUrl(video.fileName) || video.fileName;
          console.log(`Downloading video from Google Drive, file ID: ${fileId}`);
          videoBuffer = await downloadFromGoogleDrive(accessToken, channel.refreshToken, fileId);
        }

        console.log(`Video downloaded, size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

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
              uploadedVideoId: result.videoId,
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

          // Delete from storage to save space
          try {
            const fileId = extractFileIdFromUrl(video.fileName) || video.fileName;
            await deleteFile(fileId, {
              accessToken,
              refreshToken: channel.refreshToken,
            });
            console.log(`🗑️ Deleted from storage`);
          } catch (deleteError) {
            console.warn(`Failed to delete from storage (non-critical):`, deleteError);
          }

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
    results.push({
      channel: 'SYSTEM',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  console.log('\n========== Scheduler Completed ==========');
  console.log(`Processed: ${processed}, Skipped: ${skipped}`);
  
  return { processed, skipped, results };
}