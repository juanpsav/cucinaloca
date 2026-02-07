'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Search, ExternalLink, Clock, Users, AlertCircle, Loader2, ChevronUp, ChevronDown, MessageSquare, UtensilsCrossed } from 'lucide-react';
import { useGooglePlaces } from '../hooks/useGooglePlaces';
import { Recipe, ParseRecipeResponse, ParseRecipeError, RecipeAnalysis, UnifiedAnalysisResponse } from '../types/recipe';
import ReviewsSummary from './ReviewsSummary';
import SkeletonCard from './SkeletonCard';
import ChatSection from './ChatSection';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function RecipeForm() {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipeAnalysis, setRecipeAnalysis] = useState<RecipeAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [reviewsSummary, setReviewsSummary] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false);
  const [localAlternativesHeight, setLocalAlternativesHeight] = useState(256);
  const [activeTab, setActiveTab] = useState<'recipe' | 'alternatives' | 'chat'>('recipe');

  const localAlternativesRef = useRef<HTMLDivElement>(null);
  const { inputRef, isLoaded, selectedPlace, setSelectedPlace, loadMapsApi } = useGooglePlaces(GOOGLE_PLACES_API_KEY);

  // Update city state when a place is selected
  useEffect(() => {
    if (selectedPlace) {
      setCity(selectedPlace.formatted_address);
    }
  }, [selectedPlace]);

  // Extract region string to avoid unnecessary re-renders
  const region = selectedPlace?.formatted_address?.split(',').slice(1).join(',').trim();

  const generateRecipeAnalysis = useCallback(async () => {
    if (!recipe || !city) return;

    setAnalysisLoading(true);
    setReviewsLoading(true);
    setAnalysisError(null);

    try {
      // Call both APIs in parallel for better performance
      const [analysisResult, reviewsResult] = await Promise.allSettled([
        // Analysis API call
        fetch('/api/analyze-recipe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipe: {
              name: recipe.name,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              description: recipe.description,
            },
            city: city,
            region: region || undefined,
          }),
        }).then(async (response) => {
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. Please check your API configuration.');
          }
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze recipe');
          }
          return data as UnifiedAnalysisResponse;
        }),

        // Reviews API call
        fetch('/api/analyze-reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipe: {
              name: recipe.name,
              description: recipe.description,
            },
          }),
        }).then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to generate review summary');
          }
          return data.summary as string;
        }),
      ]);

      // Handle analysis result
      if (analysisResult.status === 'fulfilled') {
        setRecipeAnalysis(analysisResult.value.analysis);
      } else {
        console.error('Analysis error:', analysisResult.reason);
        const err = analysisResult.reason;
        if (err instanceof Error) {
          if (err.message.includes('API key not configured')) {
            setAnalysisError('OpenAI API key not configured. Please add your API key to your environment variables.');
          } else if (err.message.includes('rate limit')) {
            setAnalysisError('OpenAI rate limit exceeded. Please try again in a few minutes.');
          } else if (err.message.includes('JSON') || err.message.includes('<!DOCTYPE')) {
            setAnalysisError('Server error occurred. Please check your API configuration and try again.');
          } else {
            setAnalysisError(err.message);
          }
        } else {
          setAnalysisError('Failed to analyze recipe. Please try again.');
        }
      }

      // Handle reviews result
      if (reviewsResult.status === 'fulfilled') {
        setReviewsSummary(reviewsResult.value);
      } else {
        console.error('Reviews error:', reviewsResult.reason);
        // Reviews failure is not critical, so we don't show an error to the user
        setReviewsSummary(null);
      }

    } catch (err) {
      console.error('Unexpected error:', err);
      setAnalysisError('An unexpected error occurred. Please try again.');
    } finally {
      setAnalysisLoading(false);
      setReviewsLoading(false);
    }
  }, [recipe, city, region]);

  // Generate recipe analysis when we have both recipe and city
  useEffect(() => {
    if (recipe && city && recipe.ingredients.length > 0) {
      generateRecipeAnalysis();
    }
  }, [recipe, city, generateRecipeAnalysis]);

  // Measure Local Alternatives height to match Original Recipe collapsed height
  useEffect(() => {
    if (localAlternativesRef.current && recipeAnalysis && !isRecipeExpanded) {
      const timer = setTimeout(() => {
        if (localAlternativesRef.current) {
          const height = localAlternativesRef.current.offsetHeight;
          setLocalAlternativesHeight(Math.max(height - 60, 180));
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [recipeAnalysis, isRecipeExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeUrl.trim() || !city.trim()) return;

    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setRecipeAnalysis(null);
    setAnalysisError(null);

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

    if (selectedPlace && value !== selectedPlace.formatted_address) {
      setSelectedPlace(null);
    }
  };

  const handleExpandToggle = () => {
    setIsRecipeExpanded(!isRecipeExpanded);
    if (isRecipeExpanded) {
      setLocalAlternativesHeight(256);
    }
  };

  // Memoize ingredient list to prevent unnecessary re-renders
  const ingredientsList = useMemo(() => {
    if (!recipe) return null;
    return recipe.ingredients.map((ingredient, index) => (
      <li key={index} className="flex items-start gap-2">
        <span className="text-sage-green">✓</span>
        <span>{ingredient}</span>
      </li>
    ));
  }, [recipe]);

  // Memoize instructions list to prevent unnecessary re-renders
  const instructionsList = useMemo(() => {
    if (!recipe || recipe.instructions.length === 0) return null;
    return recipe.instructions.map((instruction, index) => (
      <li key={index} className="flex gap-2">
        <span className="font-semibold text-sage-green flex-shrink-0">{index + 1}.</span>
        <span>{instruction}</span>
      </li>
    ));
  }, [recipe]);

  return (
    <>
      {/* Input Form */}
      <div
        className="w-full max-w-lg px-5 xl:px-0 mx-auto animate-fade-up opacity-0"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Input Fields - Stacked on mobile, side by side on desktop */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label htmlFor="recipe-url" className="sr-only">Recipe URL</label>
              <input
                id="recipe-url"
                type="url"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                placeholder="Recipe URL..."
                aria-label="Recipe URL"
                className="w-full px-3 py-2 text-sm border border-sage-green/30 rounded-lg focus:ring-2 focus:ring-sage-green focus:border-transparent transition-all text-sage-green placeholder-sage-green/50 bg-white shadow-sm hover:shadow-md"
                required
                autoComplete="off"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="city-input" className="sr-only">City</label>
              <input
                id="city-input"
                ref={inputRef}
                type="text"
                value={city}
                onChange={handleCityInputChange}
                onFocus={loadMapsApi}
                placeholder={isLoaded ? "Your city..." : "Click to start typing your city..."}
                aria-label="City"
                className="w-full px-3 py-2 text-sm border border-sage-green/30 rounded-lg focus:ring-2 focus:ring-sage-green focus:border-transparent transition-all text-sage-green placeholder-sage-green/50 bg-white shadow-sm hover:shadow-md"
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !recipeUrl.trim() || !city.trim() || !isLoaded}
            className="w-full group flex items-center justify-center space-x-2 rounded-lg border border-sage-green bg-sage-green px-4 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-sage-green disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sage-green disabled:hover:text-white"
          >
            {isLoading ? (
              <span role="status" aria-live="polite" className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Analyzing Recipe...</span>
              </span>
            ) : (
              <>
                <Search className="h-4 w-4 group-hover:text-sage-green" />
                <span className="hidden sm:inline">Find Local Alternatives</span>
                <span className="sm:hidden">Find Alternatives</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-lg px-5 xl:px-0 mx-auto mt-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error parsing recipe</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {recipe && (
        <div className="w-full max-w-5xl mx-auto px-5 xl:px-0 mt-12 mb-12">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-sage-green/20 overflow-x-auto">
            <button
              onClick={() => setActiveTab('recipe')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'recipe'
                  ? 'text-sage-green border-b-2 border-sage-green'
                  : 'text-sage-green/60 hover:text-sage-green'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span>Recipe</span>
            </button>
            <button
              onClick={() => setActiveTab('alternatives')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'alternatives'
                  ? 'text-sage-green border-b-2 border-sage-green'
                  : 'text-sage-green/60 hover:text-sage-green'
              }`}
            >
              🧑‍🍳
              <span>Alternatives & Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'text-sage-green border-b-2 border-sage-green'
                  : 'text-sage-green/60 hover:text-sage-green'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat Assistant</span>
            </button>
          </div>

          {/* Recipe Tab Content */}
          {activeTab === 'recipe' && (
            <div className="grid grid-cols-1 gap-6">
            {/* Original Recipe Card */}
            <div
              className="bg-white rounded-lg border border-sage-green/20 shadow-sm overflow-hidden"
              style={{
                maxHeight: isRecipeExpanded ? 'none' : `${localAlternativesHeight}px`,
                transition: 'max-height 0.3s ease-in-out',
              }}
            >
              {/* Recipe Image with Organic Framing */}
              {recipe.image && (
                <div className="relative h-56 w-full overflow-hidden bg-sage-green/10">
                  <Image
                    src={recipe.image}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={false}
                  />
                  {/* Vignette overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/10" style={{
                    background: 'radial-gradient(circle at center, transparent 0%, transparent 60%, rgba(0,0,0,0.1) 100%)'
                  }} />
                </div>
              )}

              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex-1">
                  <h2 className="font-playfair text-lg font-bold text-sage-green-dark pr-2">{recipe.name}</h2>
                  <a
                    href={recipeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1"
                  >
                    View Original <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="p-4 overflow-y-auto">
                {recipe.description && (
                  <div className="mb-4">
                    <p className="text-gray-700 text-sm leading-relaxed">{recipe.description}</p>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {recipe.prepTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Prep: {recipe.prepTime}</span>
                      </div>
                    )}
                    {recipe.cookTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Cook: {recipe.cookTime}</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-sage-green mb-2 text-sm">Ingredients</h3>
                  <ul className="space-y-1 text-xs text-gray-700">
                    {ingredientsList}
                  </ul>
                </div>

                {instructionsList && (
                  <div>
                    <h3 className="font-semibold text-sage-green mb-2 text-sm">Instructions</h3>
                    <ol className="space-y-2 text-xs text-gray-700">
                      {instructionsList}
                    </ol>
                  </div>
                )}
              </div>

              {/* Gradient overlay when collapsed */}
              {!isRecipeExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              )}

              {/* Expand/Collapse Button */}
              <div className="border-t border-gray-100 p-2 flex justify-center">
                <button
                  onClick={handleExpandToggle}
                  className="flex items-center gap-1 text-xs text-sage-green hover:text-sage-green/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-sage-green/5"
                >
                  {isRecipeExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span>Show Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span>Show More</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Alternatives Tab Content */}
          {activeTab === 'alternatives' && (
            <div>
              {/* Local Suggestions */}
              <div ref={localAlternativesRef} className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-playfair text-lg font-bold text-sage-green-dark flex items-center gap-2">
                  🧑‍🍳
                  <span>Local Alternatives</span>
                </h2>
                <p className="text-gray-600 text-xs mt-1">
                  <span className="font-medium">📍 Location:</span> {city}
                </p>
              </div>

              <div className="p-3">
                {analysisLoading && (
                  <div className="space-y-2" role="status" aria-live="polite">
                    <SkeletonCard lines={3} className="p-3 rounded-lg bg-gray-50 border border-sage-green/20" />
                    <SkeletonCard lines={3} className="p-3 rounded-lg bg-gray-50 border border-sage-green/20" />
                    <SkeletonCard lines={3} className="p-3 rounded-lg bg-gray-50 border border-sage-green/20" />
                    <SkeletonCard lines={3} className="p-3 rounded-lg bg-gray-50 border border-sage-green/20" />
                  </div>
                )}

                {/* Analysis Error */}
                {analysisError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    <p className="font-medium">Analysis Error</p>
                    <p className="text-xs mt-1">{analysisError}</p>
                  </div>
                )}

                {/* Display Analysis */}
                {recipeAnalysis && (
                  <div className="space-y-3">
                    {/* Avoiding Processed */}
                    {recipeAnalysis.substitutions.avoidingProcessed && (
                      <div className="bg-white border border-sage-green/20 rounded-lg p-3 shadow-sm">
                        <h4 className="font-medium text-sage-green text-sm mb-1">✓ Avoiding Processed Foods</h4>
                        <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.avoidingProcessed}</p>
                      </div>
                    )}

                    {/* Seasonal Substitutions */}
                    {recipeAnalysis.substitutions.seasonal.length > 0 && (
                      <div className="bg-white border border-sage-green/20 rounded-lg p-3 shadow-sm">
                        <h4 className="font-medium text-sage-green text-sm mb-1">📅 Seasonal Ingredients</h4>
                        <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.seasonal[0]}</p>
                      </div>
                    )}

                    {/* Hyper Local Substitutions */}
                    {recipeAnalysis.substitutions.hyperLocal.length > 0 && (
                      <div className="bg-white border border-sage-green/20 rounded-lg p-3 shadow-sm">
                        <h4 className="font-medium text-sage-green text-sm mb-1">📍 Local Ingredients ({city.split(',')[0]})</h4>
                        <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.hyperLocal[0]}</p>
                      </div>
                    )}

                    {/* Regional Substitutions */}
                    {recipeAnalysis.substitutions.regional.length > 0 && (
                      <div className="bg-white border border-sage-green/20 rounded-lg p-3 shadow-sm">
                        <h4 className="font-medium text-sage-green text-sm mb-1">🗺️ Regional Ingredients ({city.split(',').slice(1).join(',').trim() || 'region'})</h4>
                        <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.regional[0]}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Placeholder when no analysis yet but recipe + city exist */}
                {!analysisLoading && !analysisError && !recipeAnalysis && recipe && city && (
                  <p className="text-gray-500 text-sm text-center py-4">Starting analysis...</p>
                )}
              </div>
            </div>

            {/* Additional Sections */}
            {recipeAnalysis && (
            <div className="mt-8 space-y-6">
              {/* The Chef's Perspective */}
              <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-playfair text-lg font-bold text-sage-green-dark flex items-center gap-2">
                    👨‍🍳
                    <span>The Chef&apos;s Perspective</span>
                  </h2>
                </div>
                <div className="p-4 space-y-6">
                  {/* What The Chef Would Appreciate Sub-section */}
                  <div>
                    <h3 className="font-playfair text-base font-semibold text-sage-green mb-4 border-b border-gray-100 pb-2">What The Chef Would Appreciate</h3>
                    {recipeAnalysis ? (
                      <div className="space-y-3">
                        {/* Technique to Appreciate */}
                        <div className="bg-cream/50 border-l-4 border-sage-green rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sage-green">🔪</span>
                            <div>
                              <h4 className="font-medium text-sage-green text-sm mb-1">Technique</h4>
                              <p className="font-lora italic text-gray-700 text-xs leading-relaxed">{recipeAnalysis.techniqueAnalysis.appreciate.replace(/\s*\*\s*$/, '')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Chef's Flavor Feedback */}
                        <div className="bg-cream/20 border-l-4 border-sage-green/70 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-600">🍋</span>
                            <div>
                              <h4 className="font-medium text-sage-green text-sm mb-1">Chef&apos;s Flavor Feedback</h4>
                              <p className="font-lora italic text-gray-700 text-xs leading-relaxed">{recipeAnalysis.flavorPairings.chefFeedback}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <SkeletonCard lines={4} className="p-3 rounded-lg bg-cream/50 border-l-4 border-sage-green/30" />
                        <SkeletonCard lines={4} className="p-3 rounded-lg bg-cream/20 border-l-4 border-sage-green/20" />
                      </div>
                    )}
                  </div>

                  {/* What The Chef Might Critique Sub-section */}
                  <div>
                    <h3 className="font-playfair text-base font-semibold text-sage-green mb-4 border-b border-gray-100 pb-2">What The Chef Might Critique</h3>
                    {recipeAnalysis ? (
                      <div className="space-y-3">
                        {/* Technique to Improve */}
                        <div className="bg-gray-100/50 border-l-4 border-gray-400 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500">🔪</span>
                            <div>
                              <h4 className="font-medium text-gray-700 text-sm mb-1">Technique</h4>
                              <p className="text-gray-600 text-xs leading-relaxed">{recipeAnalysis.techniqueAnalysis.improve}</p>
                            </div>
                          </div>
                        </div>

                        {/* Suggested Enhancement */}
                        <div className="bg-gray-100/30 border-l-4 border-gray-400/70 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500">🍋</span>
                            <div>
                              <h4 className="font-medium text-gray-700 text-sm mb-1">Flavor Enhancement</h4>
                              <p className="text-gray-600 text-xs leading-relaxed">{recipeAnalysis.flavorPairings.enhancement}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <SkeletonCard lines={4} className="p-3 rounded-soft bg-gray-100/50 border-l-4 border-sage-green/30" />
                        <SkeletonCard lines={4} className="p-3 rounded-soft bg-gray-100/30 border-l-4 border-sage-green/20" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Reviews */}
              <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-playfair text-lg font-bold text-sage-green-dark flex items-center gap-2">
                    ⭐
                    <span>User Reviews</span>
                  </h2>
                </div>
                <div className="p-4">
                  <ReviewsSummary summary={reviewsSummary} isLoading={reviewsLoading} />
                </div>
              </div>
            </div>
            )}
          </div>
          )}

          {/* Chat Tab Content */}
          {activeTab === 'chat' && (
            <ChatSection recipe={recipe} />
          )}
        </div>
      )}
    </>
  );
}
