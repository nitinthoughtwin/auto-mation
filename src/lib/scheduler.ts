import 'server-only';
import { db } from './db';
import { uploadVideo, refreshAccessToken, setThumbnail } from './youtube';
import { deleteFile } from './storage';
import { downloadFromGoogleDrive, extractFileIdFromUrl } from './google-drive';
import { getUserPlanAndUsage, checkVideoLimit } from './plan-limits';

type FrequencyType = 'daily' | 'alternate' | 'every3days' | 'every5days' | 'everySunday';



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

// Check if upload should happen based on frequency and scheduled time
function shouldUploadTime(channel: {
  uploadTime: string;
  timezone: string;
}): { inWindow: boolean; reason: string; debugInfo: Record<string, any> } {
  const timezone = channel.timezone || 'Asia/Kolkata';
  const { hours: currentHours, minutes: currentMinutes } = getCurrentTimeInTimezone(timezone);
  const { hours: scheduledHours, minutes: scheduledMinutes } = convertTo24Hour(channel.uploadTime);

  const scheduledMinutesTotal = scheduledHours * 60 + scheduledMinutes;
  const currentMinutesTotal = currentHours * 60 + currentMinutes;
  // timeDiff > 0 means current time is past scheduled time
  const timeDiff = currentMinutesTotal - scheduledMinutesTotal;

  const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
  const scheduledTimeStr = `${String(scheduledHours).padStart(2, '0')}:${String(scheduledMinutes).padStart(2, '0')}`;

  const debugInfo = {
    timezone,
    serverTime: new Date().toISOString(),
    currentTimeInTimezone: currentTimeStr,
    scheduledTime: scheduledTimeStr,
    timeDifferenceMinutes: timeDiff,
  };

  console.log('Time check:', JSON.stringify(debugInfo, null, 2));

  // Upload window: from 5 min BEFORE scheduled time up to 30 min AFTER.
  // This ensures the 5-minute cron interval always catches the window.
  if (timeDiff < -5) {
    return {
      inWindow: false,
      reason: `Too early. Current: ${currentTimeStr}, Scheduled: ${scheduledTimeStr}. Wait ${Math.abs(timeDiff) - 5} more minutes.`,
      debugInfo,
    };
  }

  if (timeDiff > 30) {
    return {
      inWindow: false,
      reason: `Missed window. Current: ${currentTimeStr}, Scheduled: ${scheduledTimeStr}. Window closed ${timeDiff - 30} minutes ago.`,
      debugInfo,
    };
  }

  return { inWindow: true, reason: `Within upload window (${timeDiff >= 0 ? '+' : ''}${timeDiff}m from scheduled time)`, debugInfo };
}

async function shouldUpload(channel: {
  id: string;
  uploadTime: string;
  frequency: string;
  timezone: string;
  lastUploadDate: Date | null;
  randomDelayMinutes: number | null;
  randomDelayDate: Date | null;
}): Promise<{ allowed: boolean; reason: string; debugInfo: Record<string, any> }> {

  const { inWindow, reason: timeReason, debugInfo } = shouldUploadTime(channel);

  if (!inWindow) {
    return { allowed: false, reason: timeReason, debugInfo };
  }

  const tz = channel.timezone || 'Asia/Kolkata';

  // Check based on frequency
  switch (channel.frequency) {
    case 'daily': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDayInTimezone(lastUpload, new Date(), tz)) {
          return { allowed: false, reason: 'Already uploaded today', debugInfo };
        }
      }
      return { allowed: true, reason: `Daily upload ready`, debugInfo };
    }

    case 'alternate': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), tz);
        if (daysSince < 2) {
          return { allowed: false, reason: `Need 2 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Every 2nd day ready', debugInfo };
    }

    case 'every3days': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), tz);
        if (daysSince < 3) {
          return { allowed: false, reason: `Need 3 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Every 3rd day ready', debugInfo };
    }

    case 'every5days': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), tz);
        if (daysSince < 5) {
          return { allowed: false, reason: `Need 5 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Every 5th day ready', debugInfo };
    }

    case 'everySunday': {
      if (getDayOfWeekInTimezone(tz) !== 0) {
        return { allowed: false, reason: 'Not Sunday', debugInfo };
      }
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        if (isSameDayInTimezone(lastUpload, new Date(), tz)) {
          return { allowed: false, reason: 'Already uploaded this Sunday', debugInfo };
        }
      }
      return { allowed: true, reason: 'Sunday upload ready', debugInfo };
    }

    case 'every6h': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const hoursSince = (Date.now() - lastUpload.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 6) {
          return { allowed: false, reason: `Need 6 hours, only ${hoursSince.toFixed(1)} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: '6-hour upload ready', debugInfo };
    }

    case 'every12h': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const hoursSince = (Date.now() - lastUpload.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12) {
          return { allowed: false, reason: `Need 12 hours, only ${hoursSince.toFixed(1)} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: '12-hour upload ready', debugInfo };
    }

    case 'weekly': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), tz);
        if (daysSince < 7) {
          return { allowed: false, reason: `Need 7 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Weekly upload ready', debugInfo };
    }

    case 'biweekly': {
      if (channel.lastUploadDate) {
        const lastUpload = new Date(channel.lastUploadDate);
        const daysSince = getDaysDifference(lastUpload, new Date(), tz);
        if (daysSince < 14) {
          return { allowed: false, reason: `Need 14 days, only ${daysSince} passed`, debugInfo };
        }
      }
      return { allowed: true, reason: 'Bi-weekly upload ready', debugInfo };
    }

    default:
      return { allowed: false, reason: `Unknown frequency: ${channel.frequency}`, debugInfo };
  }
}

// Upload a single video as PRIVATE to YouTube, then mark it as "scanning"
// Returns true if upload succeeded (even if still scanning)
async function uploadVideoToYouTube(
  channel: { id: string; name: string; accessToken: string; refreshToken: string },
  video: { id: string; title: string; description: string | null; tags: string; fileName: string; originalName: string | null; thumbnailName: string | null },
  accessToken: string,
  results: Array<{ channel: string; status: string; message: string; debugInfo?: Record<string, any> }>
): Promise<boolean> {
  // Download video
  const isUrl = video.fileName.startsWith('http://') || video.fileName.startsWith('https://');
  let videoBuffer: Buffer;

  if (isUrl) {
    console.log(`Downloading video from URL: ${video.fileName}`);
    const response = await fetch(video.fileName);
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    videoBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    const fileId = extractFileIdFromUrl(video.fileName) || video.fileName;
    console.log(`Downloading video from Google Drive, file ID: ${fileId}`);
    videoBuffer = await downloadFromGoogleDrive(accessToken, channel.refreshToken, fileId);
  }

  console.log(`Video downloaded, size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const videoTitle = video.title || video.originalName || 'Untitled Video';
  const videoDescription = video.description || '';
  const videoTags = video.tags ? video.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  // Upload as PUBLIC directly
  const result = await uploadVideo(accessToken, channel.refreshToken, {
    title: videoTitle,
    description: videoDescription,
    tags: videoTags,
    fileBuffer: videoBuffer,
    fileName: video.originalName || 'video.mp4',
    privacyStatus: 'public',
  });

  if (!result.success) throw new Error(result.error);

  // Upload thumbnail if available
  if (video.thumbnailName && result.videoId) {
    try {
      let thumbnailBuffer: Buffer;
      if (video.thumbnailName.startsWith('http')) {
        const thumbResponse = await fetch(video.thumbnailName);
        if (thumbResponse.ok) {
          thumbnailBuffer = Buffer.from(await thumbResponse.arrayBuffer());
          await setThumbnail(accessToken, channel.refreshToken, result.videoId, thumbnailBuffer);
        }
      } else {
        const thumbFileId = extractFileIdFromUrl(video.thumbnailName) || video.thumbnailName;
        thumbnailBuffer = await downloadFromGoogleDrive(accessToken, channel.refreshToken, thumbFileId);
        await setThumbnail(accessToken, channel.refreshToken, result.videoId, thumbnailBuffer);
      }
      console.log(`✅ [Thumbnail] Uploaded successfully`);
    } catch (thumbError: any) {
      console.warn(`[Thumbnail] Upload failed (non-critical):`, thumbError.message);
    }
  }

  // Mark as uploaded directly
  await db.video.update({
    where: { id: video.id },
    data: { status: 'uploaded', uploadedVideoId: result.videoId, uploadedAt: new Date() },
  });

  // Set lastUploadDate
  await db.channel.update({
    where: { id: channel.id },
    data: { lastUploadDate: new Date() },
  });

  // Delete from storage
  try {
    await deleteFile(video.fileName, { accessToken, refreshToken: channel.refreshToken });
    console.log(`🗑️ Deleted from storage`);
  } catch (deleteError) {
    console.warn(`Failed to delete from storage (non-critical):`, deleteError);
  }

  await db.schedulerLog.create({
    data: {
      channelId: channel.id,
      videoId: video.id,
      action: 'upload',
      status: 'success',
      message: `Uploaded as public (${result.videoId})`,
    },
  });

  results.push({
    channel: channel.name,
    status: 'success',
    message: `"${videoTitle}" uploaded successfully ✅`,
  });

  console.log(`✅ Uploaded as public: ${result.videoId}`);
  return true;
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

  // Write heartbeat so monitoring can track cron health
  await db.schedulerLog.create({
    data: {
      channelId: 'system',
      action: 'heartbeat',
      status: 'ok',
      message: `Cron fired at ${new Date().toISOString()}`,
    },
  }).catch(() => { /* non-critical, ignore */ });

  try {
    // ── Reset stuck 'scanning' videos (deployment / timeout can leave them stuck) ──
    // If a video has been in 'scanning' for more than 30 minutes, it means the
    // upload function was killed mid-flight. Reset to 'queued' so next cron retries.
    const stuckReset = await db.video.updateMany({
      where: {
        status: 'scanning',
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: { status: 'queued' },
    });
    if (stuckReset.count > 0) {
      console.log(`♻️ Reset ${stuckReset.count} stuck 'scanning' video(s) back to 'queued'`);
    }

    // ── Schedule new uploads ──
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
      
      const uploadCheck = await shouldUpload({
        id: channel.id,
        uploadTime: channel.uploadTime,
        frequency: channel.frequency,
        timezone: channel.timezone || 'Asia/Kolkata',
        lastUploadDate: channel.lastUploadDate,
        randomDelayMinutes: channel.randomDelayMinutes,
        randomDelayDate: channel.randomDelayDate,
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

      // Check plan limits before uploading
      if (channel.userId) {
        try {
          const { limits, usage } = await getUserPlanAndUsage(channel.userId);
          const limitCheck = checkVideoLimit(limits, usage);
          if (!limitCheck.allowed) {
            const msg = `Plan limit reached: ${limitCheck.message}`;
            console.log(`Plan limit reached for channel ${channel.name}: ${limitCheck.message}`);
            await db.schedulerLog.create({
              data: {
                channelId: channel.id,
                videoId: video.id,
                action: 'upload',
                status: 'blocked',
                message: msg,
              },
            });
            results.push({ channel: channel.name, status: 'blocked', message: msg });
            skipped++;
            continue;
          }
        } catch (limitError) {
          console.warn(`Could not check plan limits for channel ${channel.name}:`, limitError);
          const msg = 'No active subscription found — upload blocked';
          await db.schedulerLog.create({
            data: {
              channelId: channel.id,
              videoId: video.id,
              action: 'upload',
              status: 'blocked',
              message: msg,
            },
          });
          results.push({ channel: channel.name, status: 'blocked', message: msg });
          skipped++;
          continue;
        }
      }

      try {
        // Refresh token if needed
        let accessToken = channel.accessToken;
        try {
          const tokens = await refreshAccessToken(channel.refreshToken);
          accessToken = tokens.accessToken ?? channel.accessToken;
          await db.channel.update({
            where: { id: channel.id },
            data: {
              accessToken: tokens.accessToken ?? channel.accessToken,
              refreshToken: tokens.refreshToken ?? channel.refreshToken,
            },
          });
          console.log('Token refreshed successfully');
        } catch (tokenError) {
          console.error('Token refresh failed, trying existing token:', tokenError);
        }

        const uploaded = await uploadVideoToYouTube(channel, video, accessToken, results);
        if (uploaded) {
          processed++;
          // After a successful upload, re-check the limit.
          // If the limit is now reached, auto-pause the channel so the
          // user can see automation has stopped (not just visually blocked).
          if (channel.userId) {
            try {
              const { limits, usage } = await getUserPlanAndUsage(channel.userId);
              const limitCheck = checkVideoLimit(limits, usage);
              if (!limitCheck.allowed) {
                await db.channel.update({
                  where: { id: channel.id },
                  data: { isActive: false },
                });
                await db.schedulerLog.create({
                  data: {
                    channelId: channel.id,
                    action: 'automation',
                    status: 'blocked',
                    message: `Automation paused: monthly limit reached (${usage.videosThisMonth}/${limits.maxVideosPerMonth} videos used)`,
                  },
                });
                console.log(`🔒 Channel "${channel.name}" auto-paused — monthly upload limit reached`);
              }
            } catch (e) {
              console.warn('Post-upload limit check failed (non-critical):', e);
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Upload failed for ${channel.name}:`, error);
        await db.video.update({
          where: { id: video.id },
          data: { status: 'failed', error: error.message || 'Upload failed' },
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
        results.push({ channel: channel.name, status: 'failed', message: error.message || 'Upload failed' });
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