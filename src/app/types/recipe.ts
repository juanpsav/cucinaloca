export interface Recipe {
  name: string;
  description?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  ingredients: string[];
  instructions: string[];
  image?: string;
  url: string;
}

export interface ParseRecipeResponse {
  recipe: Recipe;
}

export interface ParseRecipeError {
  error: string;
}

export interface LocalSuggestion {
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

export interface LocalSuggestionsResponse {
  suggestions: LocalSuggestion[];
  location: string;
  month: string;
}

export interface LocalSuggestionsRequest {
  ingredients: string[];
  city: string;
  recipeName: string;
} 