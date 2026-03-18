import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, videos, topic } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    if (!videos || videos.length === 0) {
      // Get queued videos from database
      const queuedVideos = await db.video.findMany({
        where: {
          channelId: channelId,
          status: 'queued'
        },
        orderBy: { createdAt: 'asc' },
        take: 20 // Process max 20 at a time
      });

      if (queuedVideos.length === 0) {
        return NextResponse.json({ message: 'No queued videos found', updated: 0 });
      }

      // Generate AI metadata for each video
      const results = await Promise.all(
        queuedVideos.map(async (video, index) => {
          try {
            const metadata = await generateAIMetadata(video.title, topic, index + 1, queuedVideos.length);
            
            // Update video in database
            await db.video.update({
              where: { id: video.id },
              data: {
                title: metadata.title,
                description: metadata.description,
                tags: metadata.tags.join(', '),
              }
            });

            return { id: video.id, success: true, metadata };
          } catch (error) {
            console.error(`Failed to generate metadata for video ${video.id}:`, error);
            return { id: video.id, success: false, error: String(error) };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      return NextResponse.json({
        message: `Updated ${successCount}/${results.length} videos`,
        updated: successCount,
        results
      });
    }

    // Process provided videos
    const results = await Promise.all(
      videos.map(async (video: { id: string; title: string }, index: number) => {
        try {
          const metadata = await generateAIMetadata(video.title, topic, index + 1, videos.length);
          
          await db.video.update({
            where: { id: video.id },
            data: {
              title: metadata.title,
              description: metadata.description,
              tags: metadata.tags.join(', '),
            }
          });

          return { id: video.id, success: true, metadata };
        } catch (error) {
          console.error(`Failed to generate metadata for video ${video.id}:`, error);
          return { id: video.id, success: false, error: String(error) };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      message: `Updated ${successCount}/${results.length} videos`,
      updated: successCount,
      results
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate AI metadata', 
      details: String(error) 
    }, { status: 500 });
  }
}

function cleanFilename(filename: string): string {
  // Remove extension
  let clean = filename.replace(/\.[^/.]+$/, '');
  
  // Remove common patterns like timestamps, random numbers
  // Pattern: _2024, _2023, numbers at end, etc.
  clean = clean.replace(/[_\-]?\d{4}[_\-]?\d{1,2}[_\-]?\d{1,2}[_\-]?\d{1,2}[_\-]?\d{1,2}[_\-]?(AM|PM)?\d*/gi, '');
  clean = clean.replace(/[_\-]?\d{10,}/g, ''); // Remove long number sequences
  clean = clean.replace(/[_\-]reel[_\-]?\d*/gi, '');
  clean = clean.replace(/[_\-]reels?[_\-]?\d*/gi, '');
  
  // Replace underscores and dashes with spaces
  clean = clean.replace(/[_\-]+/g, ' ');
  
  // Remove extra spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter of each word
  clean = clean.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return clean || filename.replace(/\.[^/.]+$/, '');
}

async function generateAIMetadata(
  filename: string, 
  topic?: string | null,
  videoNumber?: number,
  totalVideos?: number
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const cleanName = cleanFilename(filename);
  const topicContext = topic ? `\n\nVideo Topic/Context: "${topic}"` : '';
  const numberSuffix = totalVideos && totalVideos > 1 ? ` Part ${videoNumber}` : '';

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a YouTube Shorts SEO expert for Indian audience. Generate viral metadata for a video.

Original Filename: "${filename}"
Cleaned Name: "${cleanName}"${topicContext}

TASK: Create viral YouTube Shorts metadata in Hindi/Hinglish.

RULES FOR TITLE:
1. Maximum 60 characters (important for Shorts)
2. Use Hindi/Hinglish language
3. Make it CLICKBAIT and ENGAGING
4. Include emotional words like "😭", "❤️", "🙏", "✨" if appropriate
5. NO numbers from filename, NO dates, NO timestamps
6. If topic is provided, use it as context${numberSuffix ? `7. Add "${numberSuffix}" at the end` : ''}

RULES FOR DESCRIPTION:
1. 100-150 words in Hindi/Hinglish
2. Include emojis
3. Ask viewers to subscribe, like, share
4. Add relevant hashtags (5-8 hashtags)
5. Make it engaging and emotional

RULES FOR TAGS:
1. Generate 8-12 relevant Hindi/English tags
2. Include mix of short and long-tail keywords
3. Include trending tags related to topic

RESPOND IN PURE JSON ONLY (no markdown):
{
  "title": "Viral title here with emoji",
  "description": "Description with emojis and hashtags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || cleanName,
        description: parsed.description || `Video about ${cleanName}`,
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
    }
    
    // Fallback
    return {
      title: cleanName + numberSuffix,
      description: `${cleanName} के बारे में यह वीडियो देखें! 🙏\n\nSubscribe करें और Like करें! ❤️\n\n#${cleanName.replace(/\s+/g, '')} #Shorts #Viral`,
      tags: [cleanName, 'Shorts', 'Viral', 'Trending']
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      title: cleanName + numberSuffix,
      description: `${cleanName} के बारे में यह वीडियो देखें! 🙏 Subscribe करें! ❤️`,
      tags: [cleanName, 'Shorts', 'Viral', 'Trending', 'India']
    };
  }
}
