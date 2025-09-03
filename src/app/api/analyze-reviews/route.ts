import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { recipe } = await request.json();

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Simple prompt for generating a review summary
    const systemMessage = `You are a food critic summarizing user reviews. Write a brief, natural paragraph (2-3 sentences) that summarizes what users typically love about this type of recipe and what they commonly suggest improving. 

Focus on:
- What users consistently praise (flavor, ease, texture, etc.)
- Common constructive feedback or suggestions
- Keep it conversational and natural

Recipe: ${recipe.name}
Description: ${recipe.description || 'No description provided'}

Write a single flowing paragraph like: "User reviews generally praise the recipe for its [positive aspects], with many noting [specific praise]. Some reviewers suggest [constructive feedback]."`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: 'Generate a review summary for this recipe.' }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary: summary.trim(),
      success: true
    });

  } catch (error) {
    console.error('Reviews analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate review summary' },
      { status: 500 }
    );
  }
}
