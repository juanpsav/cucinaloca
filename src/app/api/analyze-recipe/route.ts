import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple in-memory LRU cache for recipe analysis
// Key format: recipeName:city:month
const analysisCache = new Map<string, RecipeAnalysis>();
const MAX_CACHE_SIZE = 100;

interface RecipeAnalysis {
  techniqueAnalysis: {
    appreciate: string;
    improve: string;
  };
  flavorPairings: {
    chefFeedback: string;
    enhancement: string;
  };
  substitutions: {
    hyperLocal: string[];
    regional: string[];
    seasonal: string[];
    avoidingProcessed: string;
  };
}

interface AnalysisRequest {
  recipe: {
    name: string;
    ingredients: string[];
    instructions: string[];
    description?: string;
  };
  city: string;
  region?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { recipe, city, region } = await request.json() as AnalysisRequest;
    
    if (!recipe || !city) {
      return NextResponse.json({ 
        error: 'Missing required fields: recipe and city are required' 
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
      }, { status: 401 });
    }

    // Get current month for seasonal considerations
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    // Create cache key (recipe:city:month for seasonal sensitivity)
    const cacheKey = `${recipe.name}:${city}:${currentMonth}`;

    // Check cache first
    if (analysisCache.has(cacheKey)) {
      console.log('Serving analysis from cache:', cacheKey);
      return NextResponse.json({
        analysis: analysisCache.get(cacheKey)
      }, {
        headers: {
          'X-Cache': 'HIT',
        }
      });
    }
    
    const prompt = `You are a professional chef specializing in recipe analysis and improvement. 
You will analyze recipes focusing on techniques that professional chefs would appreciate or critique, 
flavor pairings with culinary principles, and practical substitutions for local ingredients and seasonal availability.

Recipe: "${recipe.name}"
Location: ${city}${region ? `, ${region}` : ''}
Current month: ${currentMonth}

**INGREDIENTS:**
${recipe.ingredients.map((ingredient, index) => `${index + 1}. ${ingredient}`).join('\n')}

**INSTRUCTIONS:**
${recipe.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n')}

Analyze this recipe with these criteria:

1. **Technique Analysis** (what professional chefs would appreciate or critique)
2. **Flavor Pairings** (chef's flavor feedback and suggested enhancements)
3. **Practical Substitutions** for local and seasonal ingredients

**OUTPUT YOUR RESPONSE IN THIS EXACT FORMAT:**

#### 👨‍🍳 Technique Analysis
* **Technique to Appreciate:** [max 1 sentence - what cooking technique or approach is well-executed]
* **Technique to Improve:** [max 1 sentence - what could be enhanced for better results]

#### 🧂 Flavor Pairings
* **Chef's Flavor Feedback:** [max 1 sentence - one positive flavor combination or pairing that works well in this recipe]
* **Suggested Enhancement:** [max 1 sentence - one specific flavor addition or pairing that would elevate the dish]

#### 🔄 Substitutions
1. **Local Ingredients (${city}):** 
   - [max 1 sentence - hyper local ingredient available within 25 miles]
   - [max 1 sentence - regional ingredient from within 200 miles]
2. **Seasonal (${currentMonth}):** 
   - [max 1 sentence - substitute one ingredient with a seasonal alternative for current month]
   - [max 1 sentence - substitute another ingredient with a different seasonal alternative]
3. **Avoiding Processed:** 
   - [max 1 sentence - replace one processed ingredient with whole food alternative]

**CRITICAL GUIDELINES:**
- Be SPECIFIC: Use "replace X with Y" or "substitute X with Y" format for ALL substitutions
- Focus on ingredients that are genuinely better when local/fresh
- Consider seasonal availability for ${currentMonth}
- Explain WHY the local/seasonal version improves the dish
- Keep all suggestions practical and realistic for home cooks
- Prioritize flavor improvement and culinary quality
- IMPORTANT: Even for remote locations, suggest the best available alternatives (regional, seasonal, or whole food options)
- If local options are limited, suggest the closest regional alternatives or seasonal swaps
- CRITICAL: Seasonal recommendations must SUBSTITUTE existing ingredients, not add new ones`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable professional chef who provides practical, actionable recipe analysis. Focus on techniques, flavor principles, and local/seasonal ingredient optimization. Always respond with the exact markdown format specified."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the markdown response into structured data
    const analysis = parseAnalysisResponse(responseContent);

    // Cache the analysis (LRU eviction)
    analysisCache.set(cacheKey, analysis);
    if (analysisCache.size > MAX_CACHE_SIZE) {
      const firstKey = analysisCache.keys().next().value;
      if (firstKey) analysisCache.delete(firstKey);
    }

    return NextResponse.json({
      analysis,
      location: city,
      region: region || null,
      month: currentMonth
    }, {
      headers: {
        'X-Cache': 'MISS',
      }
    });

  } catch (error) {
    console.error('Recipe analysis error:', error);
    
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
    }
    
    return NextResponse.json({ 
      error: 'Failed to analyze recipe. Please check your API configuration and try again.' 
    }, { status: 500 });
  }
}

function parseAnalysisResponse(response: string): RecipeAnalysis {
  // Helper function to extract content between markers
  const extractBetween = (text: string, startMarker: string, endMarker: string): string => {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return "";
    
    const contentStart = startIndex + startMarker.length;
    const endIndex = text.indexOf(endMarker, contentStart);
    
    if (endIndex === -1) return text.substring(contentStart).trim();
    return text.substring(contentStart, endIndex).trim();
  };



  // Helper function to extract bullet points
  const extractBulletPoints = (text: string): string[] => {
    const bulletPattern = /-\s*([^\n]+)/g;
    const items: string[] = [];
    let match;
    
    while ((match = bulletPattern.exec(text)) !== null) {
      if (match[1]) {
        // Remove any leading "- " and trim for clean output
        const cleanItem = match[1].replace(/^-\s*/, '').trim();
        items.push(cleanItem);
      }
    }
    
    return items;
  };

  // Extract technique analysis
  const techniqueAppreciate = extractBetween(response, "**Technique to Appreciate:**", "**Technique to Improve:**");
  const techniqueImprove = extractBetween(response, "**Technique to Improve:**", "#### 🧂");
  
  // Extract flavor pairings
  const flavorSection = extractBetween(response, "#### 🧂 Flavor Pairings", "#### 🔄");
  const chefFeedback = extractBetween(flavorSection, "**Chef's Flavor Feedback:**", "**Suggested Enhancement:**");
  const flavorEnhancement = extractBetween(flavorSection, "**Suggested Enhancement:**", "####");
  
  // Extract substitutions
  const substitutionsSection = extractBetween(response, "#### 🔄 Substitutions", "####");
  
  // Extract local substitutions - look for bullet points
  const localSection = extractBetween(substitutionsSection, "**Local Ingredients", "**Seasonal");
  const localItems = extractBulletPoints(localSection);
  
  // Separate hyper local and regional based on position (first is hyper local, second is regional)
  const hyperLocalItems: string[] = [];
  const regionalItems: string[] = [];
  
  if (localItems.length >= 1) {
    hyperLocalItems.push(localItems[0]);
  }
  if (localItems.length >= 2) {
    regionalItems.push(localItems[1]);
  }
  
  // Extract seasonal substitutions - look for bullet points
  const seasonalSection = extractBetween(substitutionsSection, "**Seasonal", "**Avoiding Processed");
  const seasonalItems = extractBulletPoints(seasonalSection);
  
  // Extract avoiding processed
  const avoidingProcessedRaw = extractBetween(substitutionsSection, "**Avoiding Processed:**", "####");
  const avoidingProcessed = avoidingProcessedRaw.replace(/^-\s*/, '').trim();

  return {
    techniqueAnalysis: {
      appreciate: techniqueAppreciate || "Technique analysis not available",
      improve: techniqueImprove || "Technique analysis not available"
    },
    flavorPairings: {
      chefFeedback: chefFeedback || "Chef's flavor feedback not available",
      enhancement: flavorEnhancement || "Flavor enhancement not available"
    },
    substitutions: {
      hyperLocal: hyperLocalItems.length > 0 ? hyperLocalItems : ["Hyper local substitution not available"],
      regional: regionalItems.length > 0 ? regionalItems : ["Regional substitution not available"],
      seasonal: seasonalItems.length >= 2 ? seasonalItems : ["Seasonal substitution not available", "Seasonal substitution not available"],
      avoidingProcessed: avoidingProcessed || "Processed food alternative not available"
    }
  };
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
