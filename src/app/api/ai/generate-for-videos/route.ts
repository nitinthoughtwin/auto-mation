import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { channelId, videos, topic, language } = body;

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

    const selectedLanguage = language || 'english';

    // Process videos one by one
    const results: Array<{ id: string; success: boolean; metadata?: { title: string; description: string; tags: string[] }; error?: string }> = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      try {
        // Resolve effective topic:
        // 1. User-provided topic (highest priority)
        // 2. Library category extracted from description "From: CategoryName"
        // 3. Fallback to video title
        let effectiveTopic = topic?.trim() || '';
        if (!effectiveTopic) {
          const dbVideo = await db.video.findUnique({ where: { id: video.id }, select: { description: true } });
          const fromMatch = dbVideo?.description?.match(/^From:\s*(.+)$/i);
          if (fromMatch) effectiveTopic = fromMatch[1].trim();
        }

        const metadata = await generateUniqueAIMetadata(video.title, effectiveTopic || undefined, i, videos.length, selectedLanguage);
        
        await db.video.update({
          where: { id: video.id },
          data: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags.join(', '),
          }
        });

        results.push({ id: video.id, success: true, metadata });
        
        // Longer delay between API calls to ensure different outputs
        if (i < videos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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

// Generic fallback title generator (topic-appropriate, no devotional bias)
function generateRandomTitle(topic: string, index: number, language: string): string {
  const templatesHindi = [
    `${topic} का जबरदस्त वीडियो 🔥 #shorts`,
    `${topic} - देखकर हैरान रह जाओगे 😲 #shorts`,
    `${topic} का यह वीडियो वायरल हो रहा है 🔥 #shorts`,
    `${topic} की धमाकेदार क्लिप 💥 #shorts`,
    `${topic} - आज का बेस्ट वीडियो ✅ #shorts`,
    `${topic} की यह क्लिप मिस मत करो 👀 #shorts`,
  ];
  const templatesEnglish = [
    `${topic} - You Won't Believe This 😲 #shorts`,
    `Incredible ${topic} Moment 🔥 #shorts`,
    `${topic} Gone Viral - Watch Now 👀 #shorts`,
    `Best ${topic} Clip of the Day ✅ #shorts`,
    `${topic} - Must Watch! 💥 #shorts`,
    `This ${topic} Clip is Insane 🤯 #shorts`,
  ];
  const templates = language === 'hindi' ? templatesHindi : templatesEnglish;
  return templates[(index + Math.floor(Math.random() * templates.length)) % templates.length];
}

// Generic fallback description generator
function generateRandomDescription(topic: string, index: number, language: string): string {
  if (language === 'hindi') {
    const ctasHindi = [
      '🔔 Subscribe करें! ❤️ Like करें! 📲 Share करें!',
      '👍 Video पसंद आए तो Like करें! 🔔 Subscribe करें!',
      '🔔 Channel Subscribe करें और नोटिफिकेशन ON करें!',
    ];
    const cta = ctasHindi[index % ctasHindi.length];
    return `${topic} से जुड़ा यह वीडियो देखें और अपने दोस्तों के साथ Share करें।\n\nपूरा वीडियो जरूर देखें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`;
  } else {
    const ctasEnglish = [
      '🔔 Subscribe! ❤️ Like! 📲 Share!',
      '👍 Like if you enjoyed! 🔔 Subscribe for more!',
      '🔔 Subscribe and hit the notification bell!',
    ];
    const cta = ctasEnglish[index % ctasEnglish.length];
    return `Watch this ${topic} video and share it with your friends.\n\nWatch till the end!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`;
  }
}

async function generateUniqueAIMetadata(
  filename: string, 
  topic?: string | null,
  videoIndex?: number,
  totalVideos?: number,
  language: string = 'english'
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const hasTopic = topic && topic.trim().length > 0;
  const topicText = hasTopic ? topic!.trim() : 'Video';
  const isHindi = language === 'hindi';
  const videoNum = (videoIndex || 0) + 1;

  // Unique seed so each video gets a different output
  const uniqueSeed = `${Date.now()}-${videoNum}-${Math.random().toString(36).substring(7)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 1.0,
      topP: 0.9,
      topK: 40,
    }
  });

  const prompt = isHindi ? `
तुम एक YouTube Shorts expert हो। Video #${videoNum} के लिए UNIQUE title और description बनाओ।

TOPIC: "${topicText}"
SEED: ${uniqueSeed}

IMPORTANT RULES:
- Title TOPIC के अनुसार होना चाहिए। अगर TOPIC cricket है तो cricket style, cooking है तो cooking style, news है तो news style।
- कभी भी topic से अलग या devotional/spiritual style मत use करो जब तक topic खुद devotional न हो।
- हर video का title DIFFERENT होना चाहिए।

TITLE RULES:
1. हिंदी में लिखो (देवनागरी)
2. #shorts से end करो
3. 50-70 characters
4. Topic के हिसाब से 1-2 relevant emojis
5. Clickbait style लेकिन topic-relevant
6. NO: Part 1/2, numbers, dates

DESCRIPTION RULES:
1. हिंदी में लिखो
2. 60-80 words
3. Topic relevant content
4. #Shorts #Viral #Trending hashtags
5. Subscribe, Like, Share CTA

Respond ONLY with valid JSON, nothing else:
{"title": "title here #shorts", "description": "description here", "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"]}
` : `
You are a YouTube Shorts expert. Create a UNIQUE, topic-appropriate title and description for Video #${videoNum}.

TOPIC: "${topicText}"
SEED: ${uniqueSeed}

CRITICAL RULES:
- The title style MUST match the topic. Cricket → sports style. Cooking → food style. News → news style. Devotional → devotional style.
- NEVER apply devotional/spiritual/emotional style to non-devotional topics.
- Every video title must be DIFFERENT.

TITLE RULES:
1. Write in English
2. End with #shorts
3. 50-70 characters
4. 1-2 relevant emojis matching the topic
5. Clickbait style but topic-relevant
6. NO: Part 1/2, numbers, dates

DESCRIPTION RULES:
1. Write in English
2. 60-80 words
3. Topic-relevant content
4. #Shorts #Viral #Trending hashtags
5. Subscribe, Like, Share CTA

Respond ONLY with valid JSON, nothing else:
{"title": "title here #shorts", "description": "description here", "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"]}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`Gemini response for video ${videoNum} (${language}):`, text.substring(0, 200));
    
    let parsed: { title?: string; description?: string; tags?: string[] } | null = null;
    
    try {
      parsed = JSON.parse(text);
    } catch (e) {
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
      let finalTitle = String(parsed.title).trim();
      let finalDesc = String(parsed.description || '').trim();
      
      // Clean title
      finalTitle = finalTitle.replace(/\s+\d+\s*$/g, '').trim();
      finalTitle = finalTitle.replace(/\s*Part\s*\d+/gi, '').trim();
      finalTitle = finalTitle.replace(/\s*(Episode|Ep|Epi)\s*\d+/gi, '').trim();
      finalTitle = finalTitle.replace(/\d{6,}/g, '').trim();
      
      // Ensure #shorts
      if (!finalTitle.toLowerCase().includes('#shorts')) {
        finalTitle = finalTitle + ' #shorts';
      }
      
      if (!finalDesc.toLowerCase().includes('#shorts')) {
        finalDesc = finalDesc + '\n\n#Shorts #Viral #Trending';
      }
      
      if (finalTitle.length > 65) {
        finalTitle = finalTitle.substring(0, 62) + '...';
      }
      
      const tags = Array.isArray(parsed.tags) 
        ? parsed.tags.filter((t: any) => t && String(t).length > 0).map((t: any) => String(t)).slice(0, 12)
        : [];
      
      if (finalTitle.length > 5 && finalDesc.length > 20) {
        return {
          title: finalTitle,
          description: finalDesc,
          tags: tags.length > 0 ? tags : generateDefaultTags(topicText)
        };
      }
    }
    
    // Fallback with RANDOM generation
    console.log('Using random fallback for video', videoNum);
    return {
      title: generateRandomTitle(topicText, videoNum, language),
      description: generateRandomDescription(topicText, videoNum, language),
      tags: generateDefaultTags(topicText)
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    // Use random generation as fallback
    return {
      title: generateRandomTitle(topicText, videoNum, language),
      description: generateRandomDescription(topicText, videoNum, language),
      tags: generateDefaultTags(topicText)
    };
  }
}

function generateDefaultTags(topic: string): string[] {
  const words = topic.split(' ').filter(w => w.length > 2);
  const baseTags = ['Shorts', 'Viral', 'Trending', 'India', 'YouTubeShorts', '#shorts'];
  const topicTag = topic.replace(/\s+/g, '');
  
  return [topicTag, ...words, ...baseTags].slice(0, 12);
}