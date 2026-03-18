import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

interface VideoInfo {
  id: string;
  title: string;
  originalName: string;
}

// Generate AI metadata for all queued videos for a channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, videos } = body as { 
      channelId: string;
      videos: VideoInfo[];
    };

    if (!channelId || !videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: 'Channel ID and videos array required' }, { status: 400 });
    }

    const queuedVideos = await db.video.findMany({
      where: { 
        channelId,
        status: 'queued'
      },
      orderBy: { createdAt: 'asc' }
    });

    if (queuedVideos.length === 0) {
      return NextResponse.json({ error: 'No queued videos found for this channel' }, { status: 404 });
    }

    const zai = await ZAI.create();

    // Generate metadata for each video
    const results: any[] = [];

    for (const video of queuedVideos) {
      try {
        // Extract meaningful name from filename
        const cleanName = video.title
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
          .replace(/\d{4,}/g, '') // Remove long numbers (like timestamps)
          .trim();

        const prompt = `Generate YouTube video metadata for a video with filename: "${cleanName}"

Rules:
1. Language: Hindi (Hinglish - mix of Hindi and English)
2. Title should be catchy, SEO-friendly, 50-60 characters
3. Description should be engaging, 150-200 characters, include relevant keywords
4. Tags should be 5-8 relevant keywords separated by commas
5. Make each video unique based on its filename
6. For Shorts videos, include #shorts in tags

Respond in JSON format only:
{
  "title": "Your catchy title here",
  "description": "Your engaging description here",
  "tags": "tag1, tag2, tag3, tag4, tag5"
}`;

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a YouTube SEO expert. Generate catchy, SEO-optimized video metadata. Always respond in valid JSON format only, no other text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        
        // Parse JSON from response
        let metadata;
        try {
          // Try to extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            metadata = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', responseText);
          // Fallback metadata
          metadata = {
            title: cleanName.substring(0, 60),
            description: `Watch ${cleanName} - Don't forget to like and subscribe!`,
            tags: 'video, youtube, entertainment'
          };
        }

        // Update video in database
        await db.video.update({
          where: { id: video.id },
          data: {
            title: metadata.title || cleanName,
            description: metadata.description || '',
            tags: metadata.tags || ''
          }
        });
        
        results.push({ 
          videoId: video.id, 
          title: metadata.title, 
          success: true 
        });

      } catch (error: any) {
        console.error(`[AI Update] Error updating video ${video.title}:`, error);
        results.push({ 
          videoId: video.id, 
          title: video.title, 
          success: false, 
          error: error.message 
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      results
    });

  } catch (error: any) {
    console.error('[AI Update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
