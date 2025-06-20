'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, Clock, Users, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { useGooglePlaces } from './hooks/useGooglePlaces';
import { Recipe, ParseRecipeResponse, ParseRecipeError, LocalSuggestion, LocalSuggestionsResponse } from './types/recipe';
import ChatModal from './components/ChatModal';

// You'll need to set this in your environment variables
const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function Home() {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<LocalSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const { inputRef, isLoaded, selectedPlace, setSelectedPlace } = useGooglePlaces(GOOGLE_PLACES_API_KEY);

  // Update city state when a place is selected
  useEffect(() => {
    if (selectedPlace) {
      // Use the full formatted address to provide geographic context
      // This ensures we distinguish between cities with the same name (e.g., Paris, France vs Paris, Texas)
      setCity(selectedPlace.formatted_address);
    }
  }, [selectedPlace]);

  const generateLocalSuggestions = useCallback(async () => {
    if (!recipe || !city) return;

    setSuggestionsLoading(true);
    setSuggestionsError(null);
    
    try {
      const response = await fetch('/api/suggest-local-ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: recipe.ingredients,
          city: city,
          recipeName: recipe.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate local suggestions');
      }

      const successData = data as LocalSuggestionsResponse;
      setLocalSuggestions(successData.suggestions);
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  }, [recipe, city]);

  // Generate local suggestions when we have both recipe and city
  useEffect(() => {
    if (recipe && city && recipe.ingredients.length > 0) {
      generateLocalSuggestions();
    }
  }, [recipe, city, generateLocalSuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeUrl.trim() || !city.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setLocalSuggestions([]);
    setSuggestionsError(null);

    try {
      const response = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: recipeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ParseRecipeError;
        throw new Error(errorData.error || 'Failed to parse recipe');
      }

      const successData = data as ParseRecipeResponse;
      setRecipe(successData.recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    
    // Clear selected place if user is typing manually and it doesn't match the formatted address
    if (selectedPlace && value !== selectedPlace.formatted_address) {
      setSelectedPlace(null);
    }
  };



  const getCategoryColor = (category: string) => {
    console.log('Category received:', category); // Debug log
    // Distinct, harmonious colors for each category
    if (category.includes('Hyper Local') || category.includes('hyper')) {
      return 'bg-teal-50 border-teal-200 text-teal-800'; // Teal for hyper-local
    }
    if (category.includes('Regional') || category.includes('regional')) {
      return 'bg-sky-50 border-sky-200 text-sky-800'; // Sky blue for regional
    }
    if (category.includes('Seasonal') || category.includes('seasonal')) {
      return 'bg-lime-50 border-lime-200 text-lime-800'; // Lime green for seasonal
    }
    if (category.includes('Processed') || category.includes('processed')) {
      return 'bg-orange-50 border-orange-200 text-orange-800'; // Orange for avoiding processed
    }
    console.log('Using default color for category:', category); // Debug log
    return 'bg-slate-50 border-slate-200 text-slate-800'; // Slate default
  };

  const getCategoryBadgeColor = (category: string) => {
    // Distinct badge colors matching the categories
    if (category.includes('Hyper Local') || category.includes('hyper')) {
      return 'bg-teal-100 text-teal-700';
    }
    if (category.includes('Regional') || category.includes('regional')) {
      return 'bg-sky-100 text-sky-700';
    }
    if (category.includes('Seasonal') || category.includes('seasonal')) {
      return 'bg-lime-100 text-lime-700';
    }
    if (category.includes('Processed') || category.includes('processed')) {
      return 'bg-orange-100 text-orange-700';
    }
    return 'bg-slate-100 text-slate-700'; // Slate default
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Brand Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream to-lemon-cream/30"></div>
      
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-50 w-full bg-cream/95 backdrop-blur-sm border-b border-sage-green/20">
        <div className="max-w-5xl mx-auto px-5 xl:px-0 py-3">
            <h1 className="flex items-baseline">
              <span className="font-playfair text-2xl font-bold text-sage-green">Cucina</span>
              <span className="font-playfair text-2xl font-bold italic text-blood-orange">Loca</span>
            </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1">
        {/* Hero Section */}
        <div className="w-full max-w-lg px-5 xl:px-0 mx-auto pt-16">
          <div className="text-center mb-8">
            <h1
              className="animate-fade-up font-playfair text-center text-3xl font-bold tracking-[-0.02em] text-sage-green opacity-0 drop-shadow-sm [text-wrap:balance] md:text-5xl md:leading-[3.5rem]"
              style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
            >
              Smarter recipes, rooted in your region.
            </h1>
            <p
              className="mt-4 animate-fade-up text-center text-sage-green/70 opacity-0 [text-wrap:balance] text-base font-medium"
              style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
            >
              Enter a recipe URL and your location to discover the most impactful local ingredient alternatives
            </p>
          </div>

          {/* Input Form */}
          <div
            className="animate-fade-up opacity-0"
            style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
          >
                      <form onSubmit={handleSubmit} className="space-y-3">
            {/* Input Fields - Stacked on mobile, side by side on desktop */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                placeholder="Recipe URL..."
                className="flex-1 px-3 py-2 text-sm border border-sage-green/30 rounded-md focus:ring-2 focus:ring-sage-green focus:border-transparent transition-all text-sage-green placeholder-sage-green/50 bg-white shadow-sm hover:shadow-md"
                required
                autoComplete="off"
              />
              <input
                ref={inputRef}
                type="text"
                value={city}
                onChange={handleCityInputChange}
                placeholder={isLoaded ? "Your city..." : "Loading..."}
                className="flex-1 px-3 py-2 text-sm border border-sage-green/30 rounded-md focus:ring-2 focus:ring-sage-green focus:border-transparent transition-all text-sage-green placeholder-sage-green/50 bg-white shadow-sm hover:shadow-md"
                required
                autoComplete="off"
                disabled={!isLoaded}
              />
            </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !recipeUrl.trim() || !city.trim() || !isLoaded}
                className="w-full group flex items-center justify-center space-x-2 rounded-full border border-sage-green bg-sage-green px-4 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-sage-green disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sage-green disabled:hover:text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing Recipe...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 group-hover:text-sage-green" />
                    <span>Find Local Alternatives</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-xs font-medium text-red-800">Error</h3>
                    <p className="text-xs text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {recipe && (
          <div className="w-full max-w-5xl mx-auto px-5 xl:px-0 mt-12 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Recipe */}
              <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="font-playfair text-lg font-bold text-sage-green">
                      Original Recipe
                    </h2>
                    <button
                      onClick={() => setIsChatModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blood-orange bg-blood-orange/10 hover:bg-blood-orange/20 rounded-lg transition-colors border border-blood-orange/20"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Ask about this recipe
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{recipe.name}</h3>
                    {recipe.description && (
                      <p className="text-gray-600 text-xs leading-relaxed">{recipe.description}</p>
                    )}
                  </div>

                  {/* Recipe Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {recipe.prepTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{recipe.prepTime}</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    )}
                  </div>

                  {recipe.url && (
                    <a 
                      href={recipe.url} 
          target="_blank"
          rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View original recipe
                    </a>
                  )}

                                  {/* Ingredients */}
                {recipe.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">Ingredients</h4>
                    <ul className="space-y-1">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="text-gray-700 text-xs">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                                  {/* Instructions */}
                {recipe.instructions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">Instructions</h4>
                    <ol className="space-y-2">
                      {recipe.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] h-5 flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 text-xs leading-relaxed">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                </div>
              </div>

              {/* Local Suggestions */}
              <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-playfair text-lg font-bold text-sage-green">
                    🧑‍🍳 Local Alternatives
                  </h2>
                  <p className="text-gray-600 text-xs mt-1">
                    <span className="font-medium">Location:</span> {city}
                  </p>
                </div>
                
                <div className="p-4">
                  {suggestionsLoading && (
                    <div className="flex items-center gap-2 py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                      <span className="text-green-600 font-medium text-sm">Generating local suggestions...</span>
                    </div>
                  )}
                  
                  {/* Suggestions Error */}
                  {suggestionsError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-800 text-sm">Error generating suggestions</h4>
                          <p className="text-red-700 text-xs mt-1">{suggestionsError}</p>
                          <p className="text-red-600 text-xs mt-1">
                            Make sure you have added your OpenAI API key to your environment variables.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                                  {/* Local Suggestions Display */}
                {localSuggestions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 text-sm">Smart Substitutions</h3>
                    <div className="space-y-2">
                      {localSuggestions.map((suggestion, index) => (
                        <div key={index} className={`${getCategoryColor(suggestion.category)} border rounded-lg p-3`}>
                          <p className="text-xs leading-relaxed">
                            {suggestion.substitution}
                          </p>
                          {suggestion.category && (
                            <span className={`inline-block mt-1 px-2 py-0.5 ${getCategoryBadgeColor(suggestion.category)} text-xs font-medium rounded-full`}>
                              {suggestion.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                  {/* No suggestions available */}
                  {!suggestionsLoading && !suggestionsError && localSuggestions.length === 0 && recipe && city && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1 text-sm">No Local Alternatives Found</h3>
                      <p className="text-gray-600 text-xs">
                        The ingredients in this recipe may not have meaningful local alternatives in {city}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-sage-green/20 bg-cream/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 xl:px-0 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            {/* Logo */}
            <div className="flex items-baseline">
              <span className="font-playfair text-lg sm:text-xl font-bold text-sage-green">Cucina</span>
              <span className="font-playfair text-lg sm:text-xl font-bold italic text-blood-orange">Loca</span>
            </div>
            
            {/* Copyright */}
            <p className="text-sage-green/70 text-xs sm:text-sm text-center sm:text-right">
              © 2025 Cucina Loca. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      {recipe && (
        <button
          onClick={() => setIsChatModalOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-blood-orange hover:bg-blood-orange/90 text-cream rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm group"
          title="Ask about this recipe"
        >
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:block">Ask about this recipe</span>
        </button>
      )}

      {/* Chat Modal */}
      {recipe && (
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          recipe={recipe}
        />
      )}
    </div>
  );
}
