import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

interface VideoInfo {
  id: string;
  name: string;
}

// Generate unique title, description, and tags using AI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { videos, language = 'hindi' } = body as { 
      videos: VideoInfo[]; 
      language?: string;
    };

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: 'Videos array required' }, { status: 400 });
    }

    const zai = await ZAI.create();

    // Generate metadata for each video
    const results = [];

    for (const video of videos) {
      try {
        // Extract meaningful name from filename
        const cleanName = video.name
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
          .replace(/\d{4,}/g, '') // Remove long numbers (like timestamps)
          .trim();

        const prompt = `Generate YouTube video metadata for a video with filename: "${cleanName}"

Rules:
1. Language: ${language === 'hindi' ? 'Hindi (Hinglish - mix of Hindi and English)' : 'English'}
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

        results.push({
          id: video.id,
          originalName: video.name,
          title: metadata.title || cleanName,
          description: metadata.description || '',
          tags: metadata.tags || ''
        });

      } catch (error: any) {
        console.error(`[AI Generate] Error for video ${video.name}:`, error);
        // Add fallback result
        const cleanName = video.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        results.push({
          id: video.id,
          originalName: video.name,
          title: cleanName.substring(0, 60),
          description: `Watch ${cleanName}`,
          tags: 'video, entertainment',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('[AI Generate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}