import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, videos } = body;

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
        queuedVideos.map(async (video) => {
          try {
            const metadata = await generateAIMetadata(video.title);
            
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
      videos.map(async (video: { id: string; title: string }) => {
        try {
          const metadata = await generateAIMetadata(video.title);
          
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

async function generateAIMetadata(filename: string): Promise<{ title: string; description: string; tags: string[] }> {
  // Clean filename - remove extension and underscores
  const cleanName = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_\-]/g, ' ') // Replace underscores and dashes with spaces
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a YouTube video SEO expert. Generate metadata for a video based on its filename.

Filename: "${cleanName}"

Generate:
1. A catchy, SEO-optimized title in Hindi/Hinglish (max 70 characters)
2. A detailed description in Hindi/Hinglish (150-200 words) that includes:
   - Video content summary
   - Key points covered
   - Call to action for subscribe/like
   - Relevant hashtags
3. 5-8 relevant tags/keywords

Respond in this exact JSON format (no markdown, just pure JSON):
{
  "title": "Your generated title here",
  "description": "Your generated description here with hashtags",
  "tags": ["tag1", "tag2", "tag3"]
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
        tags: parsed.tags || []
      };
    }
    
    // Fallback if parsing fails
    return {
      title: cleanName,
      description: `Video about ${cleanName}. Subscribe for more content!`,
      tags: []
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    // Return basic metadata if AI fails
    return {
      title: cleanName,
      description: `Video about ${cleanName}. Subscribe for more content!`,
      tags: []
    };
  }
}