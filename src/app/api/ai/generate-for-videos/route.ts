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
      return NextResponse.json({ message: 'No videos provided', updated: 0 });
    }

    // Check if Gemini API key is set
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY not set', 
        message: 'Please add GEMINI_API_KEY to your .env file',
        updated: 0 
      }, { status: 500 });
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

async function generateAIMetadata(
  filename: string, 
  topic?: string | null,
  videoNumber?: number,
  totalVideos?: number
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const hasTopic = topic && topic.trim().length > 0;
  const videoLabel = totalVideos && totalVideos > 1 ? ` (Video ${videoNumber} of ${totalVideos})` : '';

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a viral YouTube Shorts content creator expert. Generate metadata for a video.

${hasTopic ? `🎯 TOPIC: "${topic}"` : '🎯 TOPIC: General viral content'}

Generate a VIRAL YouTube Shorts metadata in Hindi/Hinglish.

=== TITLE REQUIREMENTS ===
- Maximum 55 characters
- Must be in Hindi/Hinglish (like: "प्रेमानंद जी का यह भजन सुनकर रो पड़ोगे")
- Use 1-2 relevant emojis (🙏, 😭, ❤️, ✨, 🔥, 🙏‍♂️)
- Make it EMOTIONAL and CLICKBAIT
- Title MUST relate to the topic: "${hasTopic ? topic : 'General'}"
- DO NOT use: video, reel, part, episode, mp4, numbers
- Start with something catchy that creates curiosity

=== DESCRIPTION REQUIREMENTS ===
- 80-100 words in Hindi/Hinglish
- Add emotional hook in first line
- Include subscribe/like request
- Add 5-6 relevant hashtags at the end

=== TAGS REQUIREMENTS ===
- Exactly 10 tags
- Mix of Hindi and English keywords
- Must include topic-related tags
- Include: Shorts, Viral, Trending

${hasTopic ? `EXAMPLE GOOD TITLES for "${topic}":
- "प्रेमानंद जी की यह बात सुनकर रो पड़ोगे 😭🙏"
- "भगवान की याद में खो गए ❤️✨"
- "इस भजन को सुनकर आंखें भर आएंगी 🙏😭"` : ''}

Respond in ONLY this JSON format, no other text:
{
  "title": "your viral title here",
  "description": "your description with hashtags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini Response:', text.substring(0, 200));
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Clean title
      let finalTitle = (parsed.title || '').trim();
      // Remove any remaining numbers/dates
      finalTitle = finalTitle.replace(/\b\d{4,}\b/g, '').trim();
      
      if (finalTitle.length > 60) {
        finalTitle = finalTitle.substring(0, 57) + '...';
      }
      
      const tags = Array.isArray(parsed.tags) 
        ? parsed.tags.filter((t: string) => t && t.length > 0).slice(0, 12)
        : [];
      
      if (finalTitle && finalTitle.length > 3) {
        return {
          title: finalTitle,
          description: parsed.description || '',
          tags: tags.length > 0 ? tags : generateTags(topic)
        };
      }
    }
    
    // Fallback if parsing fails
    return generateFallbackMetadata(topic, videoNumber, totalVideos);
  } catch (error) {
    console.error('Gemini API error:', error);
    return generateFallbackMetadata(topic, videoNumber, totalVideos);
  }
}

function generateTags(topic?: string | null): string[] {
  const baseTags = ['Shorts', 'Viral', 'Trending', 'India', 'YouTubeShorts', 'MustWatch'];
  
  if (topic) {
    const topicWords = topic.split(' ').filter(w => w.length > 2);
    const topicTag = topic.replace(/\s+/g, '');
    return [topicTag, ...topicWords, ...baseTags].slice(0, 12);
  }
  
  return baseTags;
}

function generateFallbackMetadata(topic?: string | null, videoNumber?: number, totalVideos?: number): { title: string; description: string; tags: string[] } {
  const topicText = topic || 'Video';
  const partLabel = totalVideos && totalVideos > 1 ? ` Part ${videoNumber}` : '';
  
  return {
    title: `${topicText}${partLabel}`,
    description: `${topicText} का यह वीडियो देखें! 🙏\n\n🔔 Subscribe करें और Like करें! ❤️\n📱 Share करें!\n\n#${topicText.replace(/\s+/g, '')} #Shorts #Viral`,
    tags: generateTags(topic)
  };
}