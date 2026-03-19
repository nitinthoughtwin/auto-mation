import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, videos, topic, language } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    if (!videos?.length) {
      return NextResponse.json({ message: 'No videos', updated: 0 });
    }

    const selectedLanguage = language || 'english';

    const usedTitles: string[] = [];

    const results = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      try {
        const metadata = await generateUniqueAIMetadata(
          video.title,
          topic,
          i,
          videos.length,
          selectedLanguage,
          usedTitles
        );

        usedTitles.push(metadata.title);

        await db.video.update({
          where: { id: video.id },
          data: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags.join(', ')
          }
        });

        results.push({ id: video.id, success: true });

        await new Promise(r => setTimeout(r, 700));
      } catch (e) {
        results.push({ id: video.id, success: false });
      }
    }

    return NextResponse.json({
      message: 'AI metadata generation complete',
      results
    });

  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

async function generateUniqueAIMetadata(
  filename: string,
  topic: string,
  index: number,
  total: number,
  language: string,
  usedTitles: string[]
) {

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 1.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 500
    }
  });

  const prompt = `
You are a VIRAL YouTube Shorts metadata generator.

This is BATCH generation.

Video filename: "${filename}"
Topic: "${topic}"
Video number: ${index + 1} / ${total}

Already generated titles:
${usedTitles.join('\n')}

STRICT RULES:

- Generate COMPLETELY DIFFERENT wording
- Different emotion
- Different hook
- Different sentence pattern
- DO NOT repeat phrases
- Title must end with #shorts
- 1-2 emoji allowed
- Make HIGH CTR clickbait curiosity title

Return ONLY JSON:

{
"title": "...",
"description": "...",
"tags": ["...","..."]
}
`;

  let text = '';

  for (let retry = 0; retry < 3; retry++) {
    const result = await model.generateContent(prompt);
    text = result.response.text();

    try {
      const parsed = JSON.parse(text);

      if (
        parsed.title &&
        parsed.description &&
        !usedTitles.includes(parsed.title)
      ) {
        return {
          title: parsed.title,
          description: parsed.description,
          tags: parsed.tags || []
        };
      }

    } catch {}
  }

  // FINAL fallback
  return {
    title: `${topic} Truth Will Shock You 🔥 #shorts`,
    description: `Watch this viral ${topic} short till end. Must watch!\n\n#Shorts #Viral`,
    tags: [topic, 'viral', 'shorts']
  };
}