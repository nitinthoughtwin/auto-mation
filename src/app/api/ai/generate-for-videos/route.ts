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
  
  // Remove Instagram/Facebook reel patterns
  clean = clean.replace(/reel[s]?/gi, '');
  
  // Remove dates like 5_18_2024, 2024_5_18, etc.
  clean = clean.replace(/\d{1,4}[_\-\/\.]\d{1,2}[_\-\/\.]\d{2,4}/gi, '');
  clean = clean.replace(/\d{4}[_\-]?\d{2}[_\-]?\d{2}/gi, '');
  
  // Remove time patterns like 8_38_31 PM, 2_22_28 PM
  clean = clean.replace(/\d{1,2}[_\-]?\d{2}[_\-]?\d{2}[_\-]?(AM|PM)/gi, '');
  clean = clean.replace(/\d{1,2}[_\-]\d{2}[_\-]\d{2}/gi, '');
  
  // Remove long random number sequences (10+ digits - typically timestamps/IDs)
  clean = clean.replace(/\d{10,}/g, '');
  
  // Remove short number sequences that look like IDs
  clean = clean.replace(/[_\-]\d{5,}/g, '');
  clean = clean.replace(/\d{5,}[_\-]/g, '');
  
  // Remove standalone numbers
  clean = clean.replace(/[_\-]?\b\d+\b[_\-]?/g, ' ');
  
  // Clean up underscores and dashes
  clean = clean.replace(/[_\-]+/g, ' ');
  
  // Remove extra spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // Capitalize words
  clean = clean.split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return clean || 'Video';
}

async function generateAIMetadata(
  filename: string, 
  topic?: string | null,
  videoNumber?: number,
  totalVideos?: number
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const cleanName = cleanFilename(filename);
  const hasTopic = topic && topic.trim().length > 0;
  const numberSuffix = totalVideos && totalVideos > 1 ? ` Part ${videoNumber}` : '';

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a YouTube Shorts SEO expert for Indian audience. Create VIRAL metadata.

${hasTopic ? `IMPORTANT: The video is about "${topic}". Use this topic as the MAIN context for generating metadata.` : ''}

Original Filename: "${filename}"
Cleaned Name: "${cleanName}"

STRICT RULES:
1. TITLE must be in Hindi/Hinglish (mix of Hindi + English)
2. TITLE must be under 60 characters
3. TITLE must be CATCHY and EMOTIONAL - like a viral YouTube short
4. Use 1-2 emojis in title if appropriate
5. DO NOT include ANY numbers, dates, timestamps, or random digits in title
6. DO NOT use words like "reel", "video", "mp4" in title
${hasTopic ? `7. Title MUST relate to: ${topic}` : ''}

TITLE EXAMPLES:
- "प्रेमानंद जी का यह भजन सुनकर रो पड़ोगे 😭🙏"
- "भगवान की याद में खो गए ❤️✨"
- "Motivation जो बदल दे जिंदगी 🔥"

DESCRIPTION RULES:
- 80-120 words in Hindi/Hinglish
- Include 5-8 relevant hashtags
- Add subscribe/like request
- Make it engaging

TAGS RULES:
- Generate exactly 10-12 tags
- Mix of Hindi and English
- Include trending tags
- Include topic-specific tags

RESPOND IN PURE JSON ONLY:
{
  "title": "Viral title here",
  "description": "Description with hashtags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Clean title one more time to remove any numbers
      let finalTitle = parsed.title || cleanName;
      finalTitle = finalTitle.replace(/\d{4,}/g, '').trim();
      
      return {
        title: finalTitle + numberSuffix,
        description: parsed.description || generateDefaultDescription(cleanName, topic),
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: string) => t.length > 0) : []
      };
    }
    
    return getFallbackMetadata(cleanName, topic, numberSuffix);
  } catch (error) {
    console.error('Gemini API error:', error);
    return getFallbackMetadata(cleanName, topic, numberSuffix);
  }
}

function generateDefaultDescription(cleanName: string, topic?: string | null): string {
  const topicText = topic ? topic : cleanName;
  return `${topicText} के बारे में यह वीडियो देखें! 🙏\n\n🔔 Subscribe करें और Like करें! ❤️\n📱 Share करें अपने दोस्तों के साथ!\n\n#${topicText.replace(/\s+/g, '')} #Shorts #Viral #Trending #India`;
}

function getFallbackMetadata(cleanName: string, topic?: string | null, suffix?: string): { title: string; description: string; tags: string[] } {
  const topicText = topic || cleanName;
  return {
    title: `${topicText}${suffix || ''}`,
    description: generateDefaultDescription(cleanName, topic),
    tags: [
      topicText.replace(/\s+/g, ''),
      'Shorts',
      'Viral',
      'Trending',
      'India',
      topicText.split(' ')[0],
      'YouTube',
      'NewVideo',
      'MustWatch',
      'Entertainment'
    ]
  };
}