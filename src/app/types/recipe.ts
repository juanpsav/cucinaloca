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

// New unified analysis interfaces
export interface RecipeAnalysis {
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

export interface UnifiedAnalysisResponse {
  analysis: RecipeAnalysis;
  location: string;
  region: string | null;
  month: string;
}

// New interfaces for user reviews
export interface UserReview {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  date: string;
  helpful: number;
}

export interface ReviewsSummary {
  whatsGood: string[];
  whatToChange: string[];
}

export interface ReviewsAnalysisResponse {
  summary: ReviewsSummary;
  success: boolean;
} 