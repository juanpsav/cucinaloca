import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { Recipe } from '@/app/types/recipe';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch the webpage with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ 
          error: `Failed to fetch recipe page: ${response.status} ${response.statusText}` 
        }, { status: 400 });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Try to extract recipe from JSON-LD structured data first
      let recipe = extractFromJsonLd($);
      
      // If no structured data found, try microdata
      if (!recipe) {
        recipe = extractFromMicrodata($);
      }
      
      // If still no recipe, try common HTML patterns
      if (!recipe) {
        recipe = extractFromHtmlPatterns($);
      }

      if (!recipe) {
        return NextResponse.json({ 
          error: 'Could not extract recipe from this URL. Make sure it\'s a valid recipe page.' 
        }, { status: 400 });
      }

      // Add the original URL to the recipe
      recipe.url = url;

      return NextResponse.json({ recipe }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout - the recipe page took too long to load' }, { status: 408 });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Recipe parsing error:', error);
    return NextResponse.json({ 
      error: 'Failed to parse recipe. Please check the URL and try again.' 
    }, { status: 500 });
  }
}

// Add OPTIONS method for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function extractFromJsonLd($: cheerio.CheerioAPI): Recipe | null {
  const scripts = $('script[type="application/ld+json"]');
  
  for (let i = 0; i < scripts.length; i++) {
    try {
      const scriptContent = $(scripts[i]).html();
      if (!scriptContent) continue;
      
      const data = JSON.parse(scriptContent);
      const recipes = Array.isArray(data) ? data : [data];
      
      for (const item of recipes) {
        if (item['@type'] === 'Recipe') {
          return parseJsonLdRecipe(item);
        }
        // Handle nested structures
        if (item['@graph']) {
          const recipe = item['@graph'].find((node: any) => node['@type'] === 'Recipe');
          if (recipe) return parseJsonLdRecipe(recipe);
        }
      }
    } catch (e) {
      continue; // Skip invalid JSON
    }
  }
  
  return null;
}

function parseJsonLdRecipe(data: any): Recipe {
  return {
    name: data.name || 'Untitled Recipe',
    description: data.description,
    prepTime: formatTime(data.prepTime),
    cookTime: formatTime(data.cookTime),
    totalTime: formatTime(data.totalTime),
    servings: data.recipeYield ? String(data.recipeYield) : undefined,
    ingredients: Array.isArray(data.recipeIngredient) 
      ? data.recipeIngredient 
      : data.recipeIngredient ? [data.recipeIngredient] : [],
    instructions: parseInstructions(data.recipeInstructions),
    image: data.image ? (typeof data.image === 'string' ? data.image : data.image.url) : undefined,
    url: '',
  };
}

function extractFromMicrodata($: cheerio.CheerioAPI): Recipe | null {
  const recipeEl = $('[itemtype*="Recipe"]').first();
  if (!recipeEl.length) return null;

  const name = recipeEl.find('[itemprop="name"]').first().text().trim();
  if (!name) return null;

  const ingredients: string[] = [];
  recipeEl.find('[itemprop="recipeIngredient"]').each((_, el) => {
    const ingredient = $(el).text().trim();
    if (ingredient) ingredients.push(ingredient);
  });

  const instructions: string[] = [];
  recipeEl.find('[itemprop="recipeInstructions"]').each((_, el) => {
    const instruction = $(el).text().trim();
    if (instruction) instructions.push(instruction);
  });

  return {
    name,
    description: recipeEl.find('[itemprop="description"]').first().text().trim() || undefined,
    prepTime: recipeEl.find('[itemprop="prepTime"]').first().attr('datetime') || 
              recipeEl.find('[itemprop="prepTime"]').first().text().trim() || undefined,
    cookTime: recipeEl.find('[itemprop="cookTime"]').first().attr('datetime') || 
              recipeEl.find('[itemprop="cookTime"]').first().text().trim() || undefined,
    totalTime: recipeEl.find('[itemprop="totalTime"]').first().attr('datetime') || 
               recipeEl.find('[itemprop="totalTime"]').first().text().trim() || undefined,
    servings: recipeEl.find('[itemprop="recipeYield"]').first().text().trim() || undefined,
    ingredients,
    instructions,
    image: recipeEl.find('[itemprop="image"]').first().attr('src') || undefined,
    url: '',
  };
}

function extractFromHtmlPatterns($: cheerio.CheerioAPI): Recipe | null {
  // Try to find recipe title
  const titleSelectors = [
    'h1.recipe-title',
    'h1.entry-title',
    '.recipe-header h1',
    '.recipe-title',
    'h1',
  ];
  
  let name = '';
  for (const selector of titleSelectors) {
    const title = $(selector).first().text().trim();
    if (title && title.length > 3) {
      name = title;
      break;
    }
  }

  if (!name) return null;

  // Try to find ingredients
  const ingredients: string[] = [];
  const ingredientSelectors = [
    '.recipe-ingredients li',
    '.ingredients li',
    '.recipe-ingredient',
    '[class*="ingredient"] li',
    'ul li:contains("cup"):not(:has(*))',
    'ul li:contains("tsp"):not(:has(*))',
    'ul li:contains("tbsp"):not(:has(*))',
  ];

  for (const selector of ingredientSelectors) {
    $(selector).each((_, el) => {
      const ingredient = $(el).text().trim();
      if (ingredient && ingredient.length > 2 && !ingredients.includes(ingredient)) {
        ingredients.push(ingredient);
      }
    });
    if (ingredients.length > 0) break;
  }

  // Try to find instructions
  const instructions: string[] = [];
  const instructionSelectors = [
    '.recipe-instructions li',
    '.instructions li',
    '.recipe-instruction',
    '.directions li',
    '[class*="instruction"] li',
    '.recipe-method li',
    'ol li',
  ];

  for (const selector of instructionSelectors) {
    $(selector).each((_, el) => {
      const instruction = $(el).text().trim();
      if (instruction && instruction.length > 10 && !instructions.includes(instruction)) {
        instructions.push(instruction);
      }
    });
    if (instructions.length > 0) break;
  }

  // Only return if we found both ingredients and instructions
  if (ingredients.length === 0 || instructions.length === 0) {
    return null;
  }

  return {
    name,
    ingredients,
    instructions,
    url: '',
  };
}

function parseInstructions(instructions: any): string[] {
  if (!instructions) return [];
  
  if (Array.isArray(instructions)) {
    return instructions.map(instruction => {
      if (typeof instruction === 'string') return instruction;
      if (instruction.text) return instruction.text;
      if (instruction.name) return instruction.name;
      return String(instruction);
    }).filter(Boolean);
  }
  
  if (typeof instructions === 'string') return [instructions];
  if (instructions.text) return [instructions.text];
  if (instructions.name) return [instructions.name];
  
  return [String(instructions)];
}

function formatTime(time: string | undefined): string | undefined {
  if (!time) return undefined;
  
  // If it's already in a readable format, return as is
  if (!time.startsWith('PT')) return time;
  
  // Parse ISO 8601 duration (PT30M, PT1H30M, etc.)
  const match = time.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return time;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  
  return time;
} 