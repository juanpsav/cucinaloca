import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple in-memory LRU cache for review summaries
// Key format: recipe name
const reviewsCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const { recipe } = await request.json();

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }

    // Check cache first
    const cacheKey = recipe.name;
    if (reviewsCache.has(cacheKey)) {
      console.log('Serving reviews from cache:', cacheKey);
      return NextResponse.json({
        summary: reviewsCache.get(cacheKey),
        success: true
      }, {
        headers: {
          'X-Cache': 'HIT',
        }
      });
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

    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: systemMessage,
      messages: [{ role: 'user', content: 'Generate a review summary for this recipe.' }],
    });

    const firstContent = completion.content[0];
    const summary = firstContent?.type === 'text' ? firstContent.text : null;

    if (!summary) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    const trimmedSummary = summary.trim();

    // Cache the review summary (LRU eviction)
    reviewsCache.set(cacheKey, trimmedSummary);
    if (reviewsCache.size > MAX_CACHE_SIZE) {
      const firstKey = reviewsCache.keys().next().value;
      if (firstKey) reviewsCache.delete(firstKey);
    }

    return NextResponse.json({
      summary: trimmedSummary,
      success: true
    }, {
      headers: {
        'X-Cache': 'MISS',
      }
    });

  } catch (error) {
    console.error('Reviews analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate review summary' },
      { status: 500 }
    );
  }
}
