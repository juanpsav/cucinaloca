import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface LocalSuggestion {
  category: string;
  categoryIcon: string;
  originalIngredient: string;
  localAlternative: string;
  substitution: string;
  localWhy: string;
  howToSource: string;
  locality: 'hyper-local' | 'regional' | 'national';
  confidence: 'high' | 'medium' | 'low';
  processing: 'minimal' | 'moderate' | 'highly-processed';
}

interface SuggestionsRequest {
  ingredients: string[];
  city: string;
  recipeName: string;
}

export async function POST(request: NextRequest) {
  try {
    const { ingredients, city, recipeName } = await request.json() as SuggestionsRequest;
    
    if (!ingredients || !city || !recipeName) {
      return NextResponse.json({ 
        error: 'Missing required fields: ingredients, city, and recipeName are required' 
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
      }, { status: 401 });
    }

    // Get current month for seasonal considerations
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    
    const prompt = `You are a local food sourcing expert and sustainable cooking advisor. I need PRACTICAL, SPECIFIC substitutions for recipe ingredients that are clearly better when sourced locally.

Recipe: "${recipeName}"
Location: ${city}
Current month: ${currentMonth}
Original ingredients: ${ingredients.join(', ')}

**APPROACH: Create 3-5 SPECIFIC SUBSTITUTIONS** with clear "replace X with Y" format and local sourcing reasoning.

**FOCUS ON:**
- Ingredients that are genuinely better when local/fresh (produce, dairy, proteins, herbs)
- Clear swaps that improve flavor, freshness, or nutrition
- Practical alternatives available in the region
- Seasonal considerations for ${currentMonth}

**FORMAT - Provide specific substitutions like this:**
[
  {
    "category": "Hyper Local Ingredients",
    "categoryIcon": "🎯",
    "originalIngredient": "store-bought herbs",
    "localAlternative": "fresh farmers market herbs",
    "substitution": "Replace dried herbs with fresh herbs from local farmers markets",
    "localWhy": "Fresher flavor and supports local growers within 25 miles",
    "howToSource": "Visit weekend farmers markets or local farm stands",
    "locality": "hyper-local",
    "confidence": "high",
    "processing": "minimal"
  },
  {
    "category": "Seasonal Ingredients", 
    "categoryIcon": "🥬",
    "originalIngredient": "out-of-season vegetables",
    "localAlternative": "seasonal winter vegetables",
    "substitution": "Use winter vegetables like Brussels sprouts or cabbage instead of summer produce",
    "localWhy": "Peak season means better flavor, nutrition, and lower cost",
    "howToSource": "Look for seasonal produce sections at grocery stores or farmers markets",
    "locality": "regional",
    "confidence": "high", 
    "processing": "minimal"
  }
]

**CATEGORIES TO USE (EXACTLY THESE 4):**
- **🎯 Hyper Local Ingredients** - Items available within 25 miles (farmers markets, local farms)
- **📍 Regional Ingredients** - Items from within 200 miles (state/province specialties)
- **🥬 Seasonal Ingredients** - Fresh, in-season items available right now in ${currentMonth}
- **🌱 Avoiding Highly Processed Foods** - Replace processed items with whole food alternatives

**CRITICAL GUIDELINES:**
- Be SPECIFIC: "Replace X with Y" format
- Explain WHY the local version is better (flavor, freshness, seasonality, supporting local economy)
- Give practical sourcing advice (farmers markets, local stores, etc.)
- Only suggest swaps that make sense for the location and season
- Focus on ingredients where local sourcing genuinely improves the dish
- Never invent specific business names - use generic sourcing locations

**ABSOLUTELY CRITICAL:** 
- Make substitutions practical and realistic for home cooks
- Emphasize genuine benefits of local sourcing for each ingredient
- Keep sourcing advice actionable but generic (no fake business names)
- Focus on ingredients where local = better quality/taste`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable food sourcing expert who helps people find sustainable ingredient alternatives at different scales of locality. CRITICAL: Always respond with valid JSON arrays only - no markdown formatting, no code blocks, no explanations. Just pure JSON. Prioritize high-confidence local options first, then expand to broader geographic scales."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response (handle markdown code blocks)
    let suggestions: LocalSuggestion[];
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = responseContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      suggestions = JSON.parse(cleanedResponse);
    } catch {
      console.error('Failed to parse OpenAI response:', responseContent);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    if (!Array.isArray(suggestions)) {
      throw new Error('AI response is not an array');
    }

    // Filter and validate suggestions
    const validSuggestions = suggestions.filter(suggestion => 
      suggestion.category && 
      suggestion.categoryIcon && 
      suggestion.originalIngredient &&
      suggestion.localAlternative &&
      suggestion.substitution &&
      suggestion.localWhy &&
      suggestion.howToSource &&
      suggestion.locality &&
      suggestion.confidence &&
      suggestion.processing
    );

    // Sort suggestions by locality priority and confidence
    const priorityOrder = { 'hyper-local': 0, 'regional': 1, 'national': 2 };
    const confidenceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    
    validSuggestions.sort((a, b) => {
      const localityDiff = priorityOrder[a.locality] - priorityOrder[b.locality];
      if (localityDiff !== 0) return localityDiff;
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    });

    return NextResponse.json({ 
      suggestions: validSuggestions,
      location: city,
      month: currentMonth
    });

  } catch (error) {
    console.error('Local suggestions error:', error);
    
    // Check for specific OpenAI API errors
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return NextResponse.json({ 
          error: 'OpenAI API key not configured. Please add your OpenAI API key to your environment variables.' 
        }, { status: 401 });
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json({ 
          error: 'OpenAI rate limit exceeded. Please try again later.' 
        }, { status: 429 });
      }
      
      if (error.message.includes('Invalid response format') || error.message.includes('JSON')) {
        return NextResponse.json({ 
          error: 'AI response format error. Please try again.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate local ingredient suggestions. Please check your API configuration and try again.' 
    }, { status: 500 });
  }
}

// Add OPTIONS method for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 