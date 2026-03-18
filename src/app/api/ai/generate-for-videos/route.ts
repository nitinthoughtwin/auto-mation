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
        message: 'Please add GEMINI_API_KEY to your .env file. Get free key from: https://makersuite.google.com/app/apikey',
        updated: 0 
      }, { status: 500 });
    }

    // Process videos one by one to avoid rate limits
    const results: Array<{ id: string; success: boolean; metadata?: { title: string; description: string; tags: string[] }; error?: string }> = [];
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      try {
        const metadata = await generateAIMetadata(video.title, topic, i);
        
        await db.video.update({
          where: { id: video.id },
          data: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags.join(', '),
          }
        });

        results.push({ id: video.id, success: true, metadata });
        
        // Small delay between API calls to avoid rate limiting
        if (i < videos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to generate metadata for video ${video.id}:`, error);
        results.push({ id: video.id, success: false, error: String(error) });
      }
    }

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
  videoIndex?: number
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const hasTopic = topic && topic.trim().length > 0;
  const topicText = hasTopic ? topic!.trim() : 'Video';
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Random emotion/style to get different titles for each video
  const emotions = ['emotional', 'inspiring', 'shocking', 'heart-touching', 'life-changing', 'powerful', 'divine', 'spiritual'];
  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  
  // Random number to force different outputs
  const randomSeed = Math.floor(Math.random() * 10000);

  const prompt = `You are an expert YouTube Shorts creator who makes viral videos in Hindi/Hinglish.

TASK: Create a UNIQUE viral title, description and tags for a YouTube Short video.

INPUT:
- Video Topic: "${topicText}"
- Original Filename: "${filename}"
- Style: ${randomEmotion}
- Random ID: ${randomSeed}

STRICT RULES FOR TITLE:
1. Title MUST be in Hindi/Hinglish language (like: "प्रेमानंद जी का यह प्रवचन सुनकर रो पड़ोगे")
2. Title MUST end with #shorts hashtag
3. Title MUST be under 55 characters (excluding #shorts)
4. Use 1-2 emojis that match the emotion (🙏, 😭, ❤️, ✨, 🔥, 🙏‍♂️, 📿, 🕉️)
5. Make title EMOTIONAL and CLICKBAIT - create curiosity!
6. Title MUST relate directly to: "${topicText}"
7. DO NOT include: numbers, dates, Part 1/2/3, episode, video, reel, mp4, timestamps
8. Each title should be DIFFERENT and UNIQUE - be creative!
9. If topic is a person's name (like "Premanand Ji Maharaj"), create different aspects of their content
10. Make it feel like a must-watch video

GOOD TITLE EXAMPLES for "${topicText}" (create DIFFERENT ones):
- "प्रेमानंद जी की यह बात सुनकर रो पड़ोगे 😭🙏 #shorts"
- "भगवान की याद में खो गए ❤️✨ #shorts"
- "यह प्रवचन आपकी जिंदगी बदल देगा 🔥 #shorts"
- "इसे सुनकर आंखें भर आएंगी 🙏😭 #shorts"
- "सच्ची भक्ति का यह राज़ ✨ #shorts"
- "दिल छू लेने वाला प्रवचन ❤️🙏 #shorts"

STRICT RULES FOR DESCRIPTION:
1. Write in Hindi/Hinglish, 60-100 words
2. First line should hook the viewer emotionally
3. Include subscribe and like request
4. Add #shorts hashtag at the end
5. Make it personal and engaging
6. Include topic-related hashtags

STRICT RULES FOR TAGS:
1. Generate exactly 12 tags
2. Mix of Hindi and English
3. Include topic name variations
4. Include: Shorts, Viral, Trending, India, YouTubeShorts
5. Include specific topic-related tags
6. Add Hindi tags related to topic

IMPORTANT: Generate a COMPLETELY DIFFERENT and UNIQUE title for this video. Do NOT repeat or add Part numbers. Be creative!

RESPOND IN PURE JSON ONLY (no markdown, no explanation):
{
  "title": "your unique viral title here with emoji #shorts",
  "description": "your description with #shorts hashtag",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini raw response for', filename, ':', text.substring(0, 300));
    
    // Parse JSON from response - try multiple methods
    let parsed: { title?: string; description?: string; tags?: string[] } | null = null;
    
    // Method 1: Direct JSON parse
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Method 2: Extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*"tags"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('JSON parse failed:', e2);
        }
      }
    }
    
    if (parsed && parsed.title) {
      // Clean title
      let finalTitle = String(parsed.title).trim();
      
      // Remove any remaining numbers at end
      finalTitle = finalTitle.replace(/\s+\d+\s*$/g, '').trim();
      
      // Remove Part X pattern
      finalTitle = finalTitle.replace(/\s*Part\s*\d+/gi, '').trim();
      
      // Remove episode patterns
      finalTitle = finalTitle.replace(/\s*(Episode|Ep|Epi)\s*\d+/gi, '').trim();
      
      // Remove timestamps and random numbers
      finalTitle = finalTitle.replace(/\d{6,}/g, '').trim();
      finalTitle = finalTitle.replace(/\d{1,2}[-_]\d{1,2}[-_]\d{2,4}/g, '').trim();
      finalTitle = finalTitle.replace(/\d{1,2}[_:]\d{1,2}[_:]\d{1,2}\s*(AM|PM)?/gi, '').trim();
      
      // Ensure #shorts is at the end
      if (!finalTitle.toLowerCase().includes('#shorts')) {
        finalTitle = finalTitle + ' #shorts';
      }
      
      // Limit length
      if (finalTitle.length > 65) {
        finalTitle = finalTitle.substring(0, 62) + '...';
      }
      
      const tags = Array.isArray(parsed.tags) 
        ? parsed.tags.filter((t: any) => t && String(t).length > 0).map((t: any) => String(t)).slice(0, 12)
        : [];
      
      if (finalTitle.length > 5) {
        return {
          title: finalTitle,
          description: String(parsed.description || ''),
          tags: tags.length > 0 ? tags : generateDefaultTags(topicText)
        };
      }
    }
    
    // Fallback with random variation
    console.log('Using fallback for:', filename);
    return generateFallbackMetadata(topicText, videoIndex);

  } catch (error) {
    console.error('Gemini API error:', error);
    return generateFallbackMetadata(topicText, videoIndex);
  }
}

function generateDefaultTags(topic: string): string[] {
  const words = topic.split(' ').filter(w => w.length > 2);
  const baseTags = ['Shorts', 'Viral', 'Trending', 'India', 'YouTubeShorts', '#shorts'];
  const topicTag = topic.replace(/\s+/g, '');
  
  return [topicTag, ...words, ...baseTags].slice(0, 12);
}

function generateFallbackMetadata(topic: string, videoIndex?: number): { title: string; description: string; tags: string[] } {
  // Different title templates for variety
  const titleTemplates = [
    `${topic} का यह Video देखें 🙏 #shorts`,
    `${topic} की यह बात जानना जरूरी है ✨ #shorts`,
    `${topic} | Must Watch 🔥 #shorts`,
    `${topic} के बारे में यह जानें 🙏‍♂️ #shorts`,
    `यह ${topic} Video दिल छू लेगी ❤️ #shorts`,
    `${topic} से जुड़ी यह बात 😍 #shorts`,
  ];
  
  // Use index or random for variety
  const index = videoIndex !== undefined ? videoIndex % titleTemplates.length : Math.floor(Math.random() * titleTemplates.length);
  
  return {
    title: titleTemplates[index],
    description: `${topic} के बारे में यह वीडियो देखें! 🙏\n\n🔔 Subscribe करें और Like करें! ❤️\n📱 Share करें अपने दोस्तों के साथ!\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`,
    tags: generateDefaultTags(topic)
  };
}