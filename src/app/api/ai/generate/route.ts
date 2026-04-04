import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Generate title, description, and tags for video
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, input, language = 'hindi' } = body;

    // type: 'title' | 'description' | 'tags' | 'all'
    // input: video filename, topic, or brief description

    if (!input) {
      return NextResponse.json(
        { success: false, error: 'Input is required (video topic or filename)' },
        { status: 400 }
      );
    }

    console.log('=== AI Generation ===');
    console.log('Type:', type);
    console.log('Input:', input);

    const zai = await ZAI.create();

    let result: { title?: string; description?: string; tags?: string[] } = {};

    if (type === 'all' || type === 'title') {
      console.log('Generating title...');
      const titleCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a YouTube SEO expert. Generate catchy, click-worthy video titles that get views.
Rules:
- Title should be 50-60 characters max
- Use power words and emotions
- Make it engaging and curiosity-driven
- Language: ${language}
- Respond with ONLY the title, nothing else`
          },
          {
            role: 'user',
            content: `Generate a YouTube video title for: ${input}`
          }
        ],
        thinking: { type: 'disabled' }
      });

      result.title = titleCompletion.choices[0]?.message?.content?.trim() || '';
      console.log('Generated title:', result.title);
    }

    if (type === 'all' || type === 'description') {
      console.log('Generating description...');
      const descCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a YouTube SEO expert. Write video descriptions that engage viewers and boost SEO.
Rules:
- Start with a hook in first 2 lines
- Include relevant keywords naturally
- Add timestamps structure placeholder
- Add social links placeholder
- End with call-to-action
- Language: ${language}
- Keep it 200-300 characters
- Respond with ONLY the description, nothing else`
          },
          {
            role: 'user',
            content: `Write a YouTube video description for: ${input}`
          }
        ],
        thinking: { type: 'disabled' }
      });

      result.description = descCompletion.choices[0]?.message?.content?.trim() || '';
      console.log('Generated description:', result.description?.substring(0, 50) + '...');
    }

    if (type === 'all' || type === 'tags') {
      console.log('Generating tags...');
      const tagsCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a YouTube SEO expert. Generate relevant tags for videos.
Rules:
- Provide 8-12 tags
- Mix of broad and specific tags
- Include trending keywords if relevant
- Language: ${language}
- Respond with ONLY comma-separated tags, nothing else
- Example format: tag1, tag2, tag3, tag4`
          },
          {
            role: 'user',
            content: `Generate YouTube tags for: ${input}`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const tagsStr = tagsCompletion.choices[0]?.message?.content?.trim() || '';
      result.tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      console.log('Generated tags:', result.tags);
    }

    console.log('=== AI Generation Complete ===');

    return NextResponse.json({
      success: true,
      type,
      input,
      ...result
    });

  } catch (error: any) {
    console.error('AI Generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI generation failed' },
      { status: 500 }
    );
  }
}