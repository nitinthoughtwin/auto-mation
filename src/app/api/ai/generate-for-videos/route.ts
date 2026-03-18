import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
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
        const metadata = await generateUniqueAIMetadata(video.title, topic, i, videos.length, selectedLanguage);
        
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
const emotionsEnglish = [
  'emotional and heart-touching',
  'inspiring and motivational', 
  'powerful and intense',
  'transformative and life-changing',
  'deep and philosophical',
  'captivating and engaging',
  'shocking and surprising',
  'uplifting and positive'
];

const emotionsHindi = [
  'भावुक और दिल को छूने वाला',
  'प्रेरणादायक और मोटिवेशनल',
  'शक्तिशाली और गहरा',
  'जीवन बदलने वाला',
  'आध्यात्मिक और शांत',
  'प्यारा और मधुर',
  'चौंकाने वाला',
  'रोमांचक'
];

// Different content angles
const anglesEnglish = [
  'focus on a key teaching or message',
  'focus on an emotional moment',
  'focus on wisdom shared',
  'focus on life lessons',
  'focus on motivation',
  'focus on personal growth',
  'focus on shocking revelation',
  'focus on heartwarming story'
];

const anglesHindi = [
  'एक महत्वपूर्ण सीख पर ध्यान केंद्रित करें',
  'भावुक क्षण पर ध्यान दें',
  'ज्ञान पर ध्यान केंद्रित करें',
  'जीवन की सीख पर ध्यान दें',
  'प्रेरणा पर ध्यान केंद्रित करें',
  'व्यक्तिगत विकास पर ध्यान दें',
  'चौंकाने वाली बात पर ध्यान दें',
  'दिल को छूने वाली कहानी पर ध्यान दें'
];

// Description hooks
const hooksEnglish = [
  'This video will touch your heart',
  'You need to watch this',
  'This changed my perspective',
  'A must-watch moment',
  'This will inspire you',
  'Wait for the ending',
  'You won\'t believe this',
  'Life-changing content ahead'
];

const hooksHindi = [
  'यह वीडियो आपके दिल को छू जाएगी',
  'इस वीडियो में छुपा है जीवन का राज़',
  'देखें यह अद्भुत वीडियो',
  'आज जानें एक खास बात',
  'यह संदेश आपकी जिंदगी बदल सकता है',
  'इसे जरूर देखें और सुनें',
  'दिल को छूने वाला यह क्षण',
  'आध्यात्मिक उन्नति के लिए जरूरी'
];

// CTA styles
const ctaEnglish = [
  '🔔 Subscribe! ❤️ Like! 📲 Share!',
  '👍 Like if you enjoyed! 🔔 Subscribe for more!',
  '🙏 Support us - Subscribe! ❤️ Share with friends!',
  '✨ Join our community - Subscribe! 💬 Comment below!',
  '🔥 Don\'t miss out! Subscribe! Like! Share!',
  '🙌 Share this video! 🔔 Hit the bell icon!'
];

const ctaHindi = [
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
  totalVideos?: number,
  language: string = 'english'
): Promise<{ title: string; description: string; tags: string[] }> {
  
  const hasTopic = topic && topic.trim().length > 0;
  const topicText = hasTopic ? topic!.trim() : 'Video';
  const isHindi = language === 'hindi';
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Random selections for variety based on language
  const emotions = isHindi ? emotionsHindi : emotionsEnglish;
  const angles = isHindi ? anglesHindi : anglesEnglish;
  const hooks = isHindi ? hooksHindi : hooksEnglish;
  const ctas = isHindi ? ctaHindi : ctaEnglish;

  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];
  const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
  const randomCTA = ctas[Math.floor(Math.random() * ctas.length)];
  const randomSeed = Date.now() + Math.floor(Math.random() * 100000);
  const uniqueId = Math.random().toString(36).substring(7);

  const videoNum = (videoIndex || 0) + 1;

  const prompt = isHindi ? `
You are a viral YouTube Shorts title expert for Indian audience. Create UNIQUE title AND description for video #${videoNum}.

TOPIC: "${topicText}"
EMOTION: ${randomEmotion}
ANGLE: ${randomAngle}
HOOK: "${randomHook}"
CTA: "${randomCTA}"
SEED: ${randomSeed}-${uniqueId}

== TITLE RULES (हिंदी में) ==
1. Title MUST be in Hindi (Devanagari script) - जैसे: "प्रेमानंद जी की यह बात सुनकर रो पड़ोगे"
2. End with #shorts (exact spelling)
3. 40-60 characters total
4. 1-2 emojis (🙏, ❤️, ✨, 🔥, 😭, 📿)
5. Emotional + Clickbait
6. NO: numbers, Part 1/2/3, dates
7. Each title MUST be DIFFERENT and UNIQUE

== DESCRIPTION RULES (हिंदी में) ==
1. Start with hook: "${randomHook}"! 
2. Write 3-4 unique lines about content in Hindi
3. Add hashtags: #Shorts #Viral #Trending #India
4. End with CTA: "${randomCTA}"
5. Total 80-120 words in Hindi
6. Make it PERSONAL and ENGAGING
7. Each description MUST be DIFFERENT

Respond ONLY with valid JSON (no markdown):
{"title": "यहाँ हिंदी में unique title #shorts", "description": "हिंदी में description with hashtags", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]}
` : `
You are a viral YouTube Shorts title expert. Create UNIQUE title AND description for video #${videoNum}.

TOPIC: "${topicText}"
EMOTION: ${randomEmotion}
ANGLE: ${randomAngle}
HOOK: "${randomHook}"
CTA: "${randomCTA}"
SEED: ${randomSeed}-${uniqueId}

== TITLE RULES (English) ==
1. Title MUST be in English
2. End with #shorts (exact spelling)
3. 40-60 characters total
4. 1-2 emojis (🙏, ❤️, ✨, 🔥, 😭, 📿)
5. Emotional + Clickbait + Create curiosity
6. NO: numbers, Part 1/2/3, dates
7. Each title MUST be DIFFERENT and UNIQUE

== DESCRIPTION RULES (English) ==
1. Start with hook: "${randomHook}"!
2. Write 3-4 unique lines about content
3. Add hashtags: #Shorts #Viral #Trending #India
4. End with CTA: "${randomCTA}"
5. Total 80-120 words
6. Make it PERSONAL and ENGAGING
7. Each description MUST be DIFFERENT

Respond ONLY with valid JSON (no markdown):
{"title": "unique english title here #shorts", "description": "english description with hashtags", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`Gemini response for video ${videoNum} (${language}):`, text.substring(0, 300));
    
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
    return generateFallbackMetadata(topicText, videoIndex, language);

  } catch (error) {
    console.error('Gemini API error:', error);
    return generateFallbackMetadata(topicText, videoIndex, language);
  }
}

function generateDefaultTags(topic: string): string[] {
  const words = topic.split(' ').filter(w => w.length > 2);
  const baseTags = ['Shorts', 'Viral', 'Trending', 'India', 'YouTubeShorts', '#shorts'];
  const topicTag = topic.replace(/\s+/g, '');
  
  return [topicTag, ...words, ...baseTags].slice(0, 12);
}

// English fallback templates
const titleTemplatesEnglish = [
  (topic: string) => `This ${topic} Video Will Touch Your Heart 😭🙏 #shorts`,
  (topic: string) => `${topic} | Life Changing Content ❤️✨ #shorts`,
  (topic: string) => `You Need To Watch This ${topic} Video 🔥 #shorts`,
  (topic: string) => `${topic} - Wait For The Ending 😲🙏 #shorts`,
  (topic: string) => `This ${topic} Moment Is Precious 🙏‍♂️ #shorts`,
  (topic: string) => `The Truth About ${topic} ✨🙏 #shorts`,
  (topic: string) => `${topic} Changed My Life 🔥 #shorts`,
  (topic: string) => `${topic} - Must Watch 😭❤️ #shorts`,
  (topic: string) => `Beautiful ${topic} Moment 🙏✨ #shorts`,
  (topic: string) => `${topic} Message For You ❤️ #shorts`,
  (topic: string) => `Inspiring ${topic} Content 🙏🔥 #shorts`,
  (topic: string) => `${topic} Story You Must See ✨ #shorts`,
];

// Hindi fallback templates
const titleTemplatesHindi = [
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

// English description templates
const descriptionTemplatesEnglish = [
  (topic: string, hook: string, cta: string) => `${hook}! 🙏\n\nThis ${topic} content will inspire you. Watch till the end for the full message!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending #India`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ✨\n\n${topic} - This is something you need to see. Life changing content awaits!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Motivation #Inspiration`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ❤️\n\nThis ${topic} moment will give you peace. Watch and share with loved ones!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Spiritual #Peace`,
  
  (topic: string, hook: string, cta: string) => `${hook}! 🔥\n\n${topic} - You won't find this anywhere else. Like and Share!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`,
  
  (topic: string, hook: string, cta: string) => `${hook}! 🙏‍♂️\n\nThis ${topic} video will bring new light to your life. Subscribe!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Life #Wisdom`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ✨\n\n${topic} - This will inspire you. Share with your friends!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Inspirational #Motivation`,
];

// Hindi description templates
const descriptionTemplatesHindi = [
  (topic: string, hook: string, cta: string) => `${hook}! 🙏\n\n${topic} के बारे में यह वीडियो आपको बहुत पसंद आएगी। इसमें छुपे राज़ को जानें और अपनी जिंदगी में लागू करें।\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending #India`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ✨\n\n${topic} से जुड़ी यह जानकारी आपके लिए बहुत महत्वपूर्ण है। पूरा देखें और सीखें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Motivation #Inspiration`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ❤️\n\n${topic} का यह प्रवचन सुनकर आपके दिल को शांति मिलेगी। आज ही देखें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Bhakti #Spiritual`,
  
  (topic: string, hook: string, cta: string) => `${hook}! 🔥\n\n${topic} के बारे में यह खास बात आपको कहीं और नहीं मिलेगी। Like और Share जरूर करें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`,
  
  (topic: string, hook: string, cta: string) => `${hook}! 🙏‍♂️\n\n${topic} पर यह वीडियो आपके जीवन में एक नई रोशनी लाएगी। Subscribe करें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Life #Wisdom`,
  
  (topic: string, hook: string, cta: string) => `${hook}! ✨\n\n${topic} से जुड़ी यह बात आपको प्रेरित करेगी। अपने दोस्तों के साथ Share करें!\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Inspirational #Motivation`,
];

function generateFallbackMetadata(topic: string, videoIndex?: number, language: string = 'english'): { title: string; description: string; tags: string[] } {
  const isHindi = language === 'hindi';
  
  const titleTemplates = isHindi ? titleTemplatesHindi : titleTemplatesEnglish;
  const descriptionTemplates = isHindi ? descriptionTemplatesHindi : descriptionTemplatesEnglish;
  const hooks = isHindi ? hooksHindi : hooksEnglish;
  const ctas = isHindi ? ctaHindi : ctaEnglish;
  
  const titleIndex = videoIndex !== undefined ? videoIndex % titleTemplates.length : Math.floor(Math.random() * titleTemplates.length);
  const descIndex = videoIndex !== undefined ? videoIndex % descriptionTemplates.length : Math.floor(Math.random() * descriptionTemplates.length);
  const hookIndex = videoIndex !== undefined ? videoIndex % hooks.length : Math.floor(Math.random() * hooks.length);
  const ctaIndex = videoIndex !== undefined ? videoIndex % ctas.length : Math.floor(Math.random() * ctas.length);
  
  const title = titleTemplates[titleIndex](topic);
  const description = descriptionTemplates[descIndex](topic, hooks[hookIndex], ctas[ctaIndex]);
  
  return {
    title,
    description,
    tags: generateDefaultTags(topic)
  };
}