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

// Title word banks for variety
const titleWordsHindi = {
  emotions: ['रो पड़ोगे', 'दिल छू गया', 'हैरान रह जाओगे', 'शांति मिलेगी', 'प्रेरित होगे', 'बदल जाओगे', 'सुकून मिलेगा', 'जीवन बदलेगा'],
  actions: ['सुनकर', 'देखकर', 'जानकर', 'समझकर', 'जानें', 'देखें', 'सुनें', 'पढ़ें'],
  reactions: ['अविश्वसनीय', 'अद्भुत', 'शानदार', 'जबरदस्त', 'कमाल का', 'धमाकेदार', 'लाजवाब', 'ज़बरदस्त'],
  calls: ['जरूर देखें', 'शेयर करें', 'सुनें पूरा', 'मिस न करें', 'आज ही देखें', 'तुरंत देखें', 'जल्दी देखें', 'जरूर सुनें'],
};

const titleWordsEnglish = {
  emotions: ['Will Make You Cry', 'Touch Your Heart', 'Leave You Shocked', 'Give You Peace', 'Inspire You', 'Change You', 'Amaze You', 'Blow Your Mind'],
  actions: ['Watch This', 'Listen To This', 'See What Happens', 'You Need To See', 'Must Watch', 'Wait For It', 'Don\'t Miss', 'Viral Content'],
  reactions: ['Unbelievable', 'Amazing', 'Incredible', 'Shocking', 'Beautiful', 'Powerful', 'Life Changing', 'Heart Touching'],
  calls: ['Must Watch', 'Share Now', 'Subscribe', 'Like Now', 'Watch Till End', 'Don\'t Skip', 'Full Video', 'Share It'],
};

// Generate completely random title
function generateRandomTitle(topic: string, index: number, language: string): string {
  const words = language === 'hindi' ? titleWordsHindi : titleWordsEnglish;
  
  const emotion = words.emotions[Math.floor(Math.random() * words.emotions.length)];
  const action = words.actions[Math.floor(Math.random() * words.actions.length)];
  const reaction = words.reactions[Math.floor(Math.random() * words.reactions.length)];
  const call = words.calls[Math.floor(Math.random() * words.calls.length)];
  
  const templates = language === 'hindi' ? [
    `${topic} ${action} ${emotion} 😭🙏`,
    `${reaction}! ${topic} ${call} 🔥`,
    `${topic} - ${emotion} ✨`,
    `${action} ${topic} ${reaction} ❤️`,
    `${topic} का यह राज़ ${call} 😲🙏`,
    `${reaction} ${topic} Video ${call} 🔥`,
  ] : [
    `${topic} ${action} ${emotion} 😭🙏`,
    `${reaction}! ${topic} ${call} 🔥`,
    `${topic} - ${emotion} ✨`,
    `${action} ${topic} ${reaction} ❤️`,
    `This ${topic} Will ${emotion} 😲🙏`,
    `${reaction} ${topic} Content ${call} 🔥`,
  ];
  
  const templateIndex = (index + Math.floor(Math.random() * 100)) % templates.length;
  return templates[templateIndex] + ' #shorts';
}

// Generate completely random description
function generateRandomDescription(topic: string, index: number, language: string): string {
  const hooksHindi = [
    'यह वीडियो आपके दिल को छू जाएगी',
    'इस वीडियो में छुपा है जीवन का राज़',
    'देखें यह अद्भुत वीडियो',
    'आज जानें एक खास बात',
    'यह संदेश आपकी जिंदगी बदल सकता है',
  ];
  
  const hooksEnglish = [
    'This video will touch your heart',
    'The secret hidden in this video',
    'Watch this amazing content',
    'Learn something special today',
    'This message can change your life',
  ];
  
  const ctasHindi = [
    '🔔 Subscribe करें! ❤️ Like करें! 📲 Share करें!',
    '👍 Video पसंद आए तो Like करें! 🔔 Subscribe करें!',
    '🙏 आपका समर्थन करें - Subscribe! ❤️ Share करें!',
  ];
  
  const ctasEnglish = [
    '🔔 Subscribe! ❤️ Like! 📲 Share!',
    '👍 Like if you enjoyed! 🔔 Subscribe for more!',
    '🙏 Support us - Subscribe! ❤️ Share with friends!',
  ];
  
  const hooks = language === 'hindi' ? hooksHindi : hooksEnglish;
  const ctas = language === 'hindi' ? ctasHindi : ctasEnglish;
  
  const hookIndex = (index + Math.floor(Math.random() * 100)) % hooks.length;
  const ctaIndex = (index + Math.floor(Math.random() * 100)) % ctas.length;
  
  const hook = hooks[hookIndex];
  const cta = ctas[ctaIndex];
  
  if (language === 'hindi') {
    const lines = [
      `${topic} के बारे में यह वीडियो आपको बहुत पसंद आएगी।`,
      `इसमें छुपे राज़ को जानें और अपनी जिंदगी में लागू करें।`,
      `${topic} से जुड़ी यह जानकारी बहुत महत्वपूर्ण है।`,
      `पूरा देखें और अपने दोस्तों को भी बताएं।`,
    ];
    const randomLines = lines.sort(() => Math.random() - 0.5).slice(0, 2);
    
    return `${hook}! 🙏\n\n${randomLines.join(' ')}\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`;
  } else {
    const lines = [
      `This ${topic} content is truly special.`,
      `Watch till the end for the complete message.`,
      `Something you don't want to miss.`,
      `Share with your friends and family.`,
    ];
    const randomLines = lines.sort(() => Math.random() - 0.5).slice(0, 2);
    
    return `${hook}! 🙏\n\n${randomLines.join(' ')}\n\n${cta}\n\n#${topic.replace(/\s+/g, '')} #Shorts #Viral #Trending`;
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
  
  // Unique random seed for THIS specific video
  const uniqueSeed = `${Date.now()}-${videoNum}-${Math.random().toString(36).substring(7)}`;
  
  // Pre-generate random elements for the prompt
  const randomWords = isHindi ? titleWordsHindi : titleWordsEnglish;
  const randomEmotion = randomWords.emotions[Math.floor(Math.random() * randomWords.emotions.length)];
  const randomAction = randomWords.actions[Math.floor(Math.random() * randomWords.actions.length)];
  const randomReaction = randomWords.reactions[Math.floor(Math.random() * randomWords.reactions.length)];
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 1.0,  // Maximum randomness
      topP: 0.9,
      topK: 40,
    }
  });

  const prompt = isHindi ? `
तुम एक YouTube Shorts expert हो। Video #${videoNum} के लिए UNIQUE title और description बनाओ।

TOPIC: "${topicText}"
VIDEO NUMBER: ${videoNum}
UNIQUE SEED: ${uniqueSeed}
RANDOM EMOTION: ${randomEmotion}
RANDOM ACTION: ${randomAction}

** IMPORTANT: यह Video #${videoNum} है। पिछली videos से DIFFERENT title बनाओ! **

TITLE RULES:
1. हिंदी में लिखो (देवनागरी स्क्रिप्ट)
2. #shorts से end करो
3. 40-60 characters
4. 1-2 emojis (🙏, ❤️, ✨, 🔥, 😭)
5. यह जरूर use करो: "${randomEmotion}" या "${randomAction}"
6. NO: Part 1/2, numbers, dates

DESCRIPTION RULES:
1. हिंदी में लिखो
2. 80-100 words
3. #Shorts #Viral #Trending hashtags
4. Subscribe, Like, Share CTA

Respond ONLY JSON:
{"title": "हिंदी title #shorts", "description": "हिंदी description", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]}
` : `
You are a YouTube Shorts expert. Create UNIQUE title and description for Video #${videoNum}.

TOPIC: "${topicText}"
VIDEO NUMBER: ${videoNum}
UNIQUE SEED: ${uniqueSeed}
RANDOM EMOTION: ${randomEmotion}
RANDOM ACTION: ${randomAction}

** IMPORTANT: This is Video #${videoNum}. Make it DIFFERENT from previous videos! **

TITLE RULES:
1. Write in English
2. End with #shorts
3. 40-60 characters
4. 1-2 emojis (🙏, ❤️, ✨, 🔥, 😭)
5. MUST use: "${randomEmotion}" or "${randomAction}"
6. NO: Part 1/2, numbers, dates

DESCRIPTION RULES:
1. Write in English
2. 80-100 words
3. #Shorts #Viral #Trending hashtags
4. Subscribe, Like, Share CTA

Respond ONLY JSON:
{"title": "english title #shorts", "description": "english description", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"]}
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