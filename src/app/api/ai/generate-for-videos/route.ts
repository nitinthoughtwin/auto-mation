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

    // Process videos one by one
    const results: Array<{ id: string; success: boolean; metadata?: { title: string; description: string; tags: string[] }; error?: string }> = [];
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      try {
        const metadata = await generateUniqueAIMetadata(video.title, topic, i, videos.length);
        
        await db.video.update({
          where: { id: video.id },
          data: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags.join(', '),
          }
        });

        results.push({ id: video.id, success: true, metadata });
        
        // Delay between API calls
        if (i < videos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
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

// Different emotions for variety
const emotions = [
  'emotional and heart-touching',
  'inspiring and motivational', 
  'devotional and spiritual',
  'powerful and intense',
  'peaceful and calming',
  'transformative and life-changing',
  'deep and philosophical',
  'pure and divine'
];

// Different content angles
const angles = [
  'focus on a key teaching or message',
  'focus on an emotional moment',
  'focus on wisdom shared',
  'focus on life lessons',
  'focus on spiritual connection',
  'focus on devotion and faith',
  'focus on inner peace',
  'focus on personal transformation'
];

// Different description hooks
const descriptionHooks = [
  'यह वीडियो आपके दिल को छू जाएगी',
  'इस वीडियो में छुपा है जीवन का राज़',
  'देखें यह अद्भुत प्रवचन',
  'आज जानें एक खास बात',
  'यह संदेश आपकी जिंदगी बदल सकता है',
  'इसे जरूर देखें और सुनें',
  'दिल को छूने वाला यह क्षण',
  'आध्यात्मिक उन्नति के लिए जरूरी'
];

// Different CTA styles
const ctaStyles = [
  '🔔 Subscribe करें! ❤️ Like करें! 📲 Share करें!',
  '👍 Video पसंद आए तो Like करें! 🔔 Channel Subscribe करें!',
  '🙏 आपका समर्थन करें - Subscribe! ❤️ Share करें!',
  '✨ हमारे साथ जुड़ें - Subscribe करें! 💬 Comment करें!',
  '🔥 Miss mat karna! Subscribe! Like! Share!',
  '🙌 इस वीडियो को Share करें! 🔔 Bell Icon Dabayein!'
];

async function generateUniqueAIMetadata(
  filename: string, 
  topic?: string | null,
  videoIndex?: number,
  totalVideos?: number
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const hasTopic = topic && topic.trim().length > 0;
  const topicText = hasTopic ? topic!.trim() : 'Video';
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Random selections for variety
  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];
  const randomHook = descriptionHooks[Math.floor(Math.random() * descriptionHooks.length)];
  const randomCTA = ctaStyles[Math.floor(Math.random() * ctaStyles.length)];
  const randomSeed = Date.now() + Math.floor(Math.random() * 100000);
  const uniqueId = Math.random().toString(36).substring(7);

  const videoNum = (videoIndex || 0) + 1;

  const prompt = `You are a viral YouTube Shorts expert for Indian audience. Create UNIQUE title AND description for video #${videoNum}.

TOPIC: "${topicText}"
EMOTION: ${randomEmotion}
ANGLE: ${randomAngle}
HOOK STYLE: ${randomHook}
SEED: ${randomSeed}-${uniqueId}

== TITLE RULES ==
1. Hindi/Hinglish (Devanagari script)
2. End with #shorts (exact)
3. 40-60 characters total
4. 1-2 emojis (🙏, ❤️, ✨, 🔥, 😭, 📿)
5. Emotional + Clickbait
6. NO: numbers, Part 1/2/3, dates

== DESCRIPTION RULES ==
1. Start with emotional hook: "${randomHook}"
2. Write 3-4 unique lines about the content (different each time!)
3. Add hashtags: #Shorts #Viral #Trending #India #${topicText.replace(/\s+/g, '')}
4. End with CTA: "${randomCTA}"
5. Total 80-120 words
6. Make it PERSONAL and ENGAGING
7. Each description should feel UNIQUE and DIFFERENT

Respond ONLY with valid JSON:
{"title": "unique title #shorts", "description": "unique description with hashtags", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`Gemini response for video ${videoNum}:`, text.substring(0, 300));
    
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
      
      // Ensure #shorts in title
      if (!finalTitle.toLowerCase().includes('#shorts')) {
        finalTitle = finalTitle + ' #shorts';
      }
      
      // Ensure #shorts in description
      if (!finalDesc.toLowerCase().includes('#shorts')) {
        finalDesc = finalDesc + '\n\n#Shorts #Viral #Trending';
      }
      
      // Limit lengths
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
    
    // Fallback
    console.log('Using fallback for video', videoNum);
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

// Fallback title templates
const titleTemplates = [
  (topic: string) => `${topic} की यह बात सुनकर रो पड़ोगे 😭🙏 #shorts`,
  (topic: string) => `${topic} | दिल छू लेने वाला प्रवचन ❤️✨ #shorts`,
  (topic: string) => `यह ${topic} वीडियो देखकर बदल जाओगे 🔥 #shorts`,
  (topic: string) => `${topic} का यह राज़ जानकर हैरान रह जाओगे 😲🙏 #shorts`,
  (topic: string) => `${topic} से जुड़ी यह बात जरूर जानें 🙏‍♂️ #shorts`,
  (topic: string) => `${topic} के बारे में सच्चाई ✨🙏 #shorts`,
  (topic: string) => `${topic} का यह प्रवचन जीवन बदल देगा 🔥 #shorts`,
  (topic: string) => `${topic} को सुनकर आंखें भर आएंगी 😭❤️ #shorts`,
  (topic: string) => `${topic} की महिमा 🙏✨ #shorts`,
  (topic: string) => `${topic} का यह संदेश दिल को छू गया ❤️ #shorts`,
  (topic: string) => `${topic} से प्रेरित होकर बनाया गया 🙏🔥 #shorts`,
  (topic: string) => `${topic} की अद्भुत कहानी ✨ #shorts`,
];

// Fallback description templates
const descriptionTemplates = [
  (topic: string, hook: string, cta: string) => `${hook}! 🙏\n\n${topic} के बारे में यह वीडियो आपको बहुत पसंद आएगी। इसमें छुपे राज़ को जानें और अपनी जिंदगी में लागू करें।\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending #India`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ✨\n\n${topic} से जुड़ी यह जानकारी आपके लिए बहुत महत्वपूर्ण है। पूरा देखें और सीखें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Motivation #Inspiration`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ❤️\n\n${topic} का यह प्रवचन सुनकर आपके दिल को शांति मिलेगी। आज ही देखें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Bhakti #Spiritual`,
  
  (topic: string, hook: string, cta: string) => `${hook}! 🔥\n\n${topic} के बारे में यह खास बात आपको कहीं और नहीं मिलेगी। Like और Share जरूर करें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`,
  
  (topic: string, hook: string, cta: string) => `${hook}! 🙏‍♂️\n\n${topic} पर यह वीडियो आपके जीवन में एक नई रोशनी लाएगी। Subscribe करें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Life #Wisdom`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ✨\n\n${topic} से जुड़ी यह बात आपको प्रेरित करेगी। अपने दोस्तों के साथ Share करें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Inspirational #Motivation`,
];

function generateFallbackMetadata(topic: string, videoIndex?: number): { title: string; description: string; tags: string[] } {
  const titleIndex = videoIndex !== undefined ? videoIndex % titleTemplates.length : Math.floor(Math.random() * titleTemplates.length);
  const descIndex = videoIndex !== undefined ? videoIndex % descriptionTemplates.length : Math.floor(Math.random() * descriptionTemplates.length);
  const hookIndex = videoIndex !== undefined ? videoIndex % descriptionHooks.length : Math.floor(Math.random() * descriptionHooks.length);
  const ctaIndex = videoIndex !== undefined ? videoIndex % ctaStyles.length : Math.floor(Math.random() * ctaStyles.length);
  
  const title = titleTemplates[titleIndex](topic);
  const description = descriptionTemplates[descIndex](topic, descriptionHooks[hookIndex], ctaStyles[ctaIndex]);
  
  return {
    title,
    description,
    tags: generateDefaultTags(topic)
  };
}
