import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { Recipe } from '@/app/types/recipe';

// Simple in-memory LRU cache for parsed recipes
const recipeCache = new Map<string, Recipe>();
const MAX_CACHE_SIZE = 100;

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

    // Check cache first
    if (recipeCache.has(url)) {
      console.log('Serving recipe from cache:', url);
      return NextResponse.json({ recipe: recipeCache.get(url) }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Cache': 'HIT',
        }
      });
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

      // Cache the parsed recipe (LRU eviction)
      recipeCache.set(url, recipe);
      if (recipeCache.size > MAX_CACHE_SIZE) {
        const firstKey = recipeCache.keys().next().value;
        if (firstKey) recipeCache.delete(firstKey);
      }

      return NextResponse.json({ recipe }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Cache': 'MISS',
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
          const recipe = item['@graph'].find((node: Record<string, unknown>) => node['@type'] === 'Recipe');
          if (recipe) return parseJsonLdRecipe(recipe);
        }
      }
    } catch {
      continue; // Skip invalid JSON
    }
  }
  
  return null;
}

function parseJsonLdRecipe(data: Record<string, unknown>): Recipe {
  const name = typeof data.name === 'string' ? data.name : 'Untitled Recipe';
  const description = typeof data.description === 'string' ? data.description : undefined;
  const prepTime = typeof data.prepTime === 'string' ? formatTime(data.prepTime) : undefined;
  const cookTime = typeof data.cookTime === 'string' ? formatTime(data.cookTime) : undefined;
  const totalTime = typeof data.totalTime === 'string' ? formatTime(data.totalTime) : undefined;
  const servings = data.recipeYield ? String(data.recipeYield) : undefined;
  
  const ingredients = Array.isArray(data.recipeIngredient) 
    ? data.recipeIngredient.filter((item): item is string => typeof item === 'string')
    : typeof data.recipeIngredient === 'string' ? [data.recipeIngredient] : [];
  
  const instructions = parseInstructions(data.recipeInstructions);
  
  let image: string | undefined;
  if (typeof data.image === 'string') {
    image = data.image;
  } else if (data.image && typeof data.image === 'object' && 'url' in data.image) {
    image = typeof data.image.url === 'string' ? data.image.url : undefined;
  }
  
  return {
    name,
    description,
    prepTime,
    cookTime,
    totalTime,
    servings,
    ingredients,
    instructions,
    image,
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

function parseInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  
  if (Array.isArray(instructions)) {
    return instructions.map(instruction => {
      if (typeof instruction === 'string') return instruction;
      if (typeof instruction === 'object' && instruction !== null) {
        if ('text' in instruction && typeof instruction.text === 'string') return instruction.text;
        if ('name' in instruction && typeof instruction.name === 'string') return instruction.name;
      }
      return String(instruction);
    }).filter(Boolean);
  }
  
  if (typeof instructions === 'string') return [instructions];
  if (typeof instructions === 'object' && instructions !== null) {
    if ('text' in instructions && typeof instructions.text === 'string') return [instructions.text];
    if ('name' in instructions && typeof instructions.name === 'string') return [instructions.name];
  }
  
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