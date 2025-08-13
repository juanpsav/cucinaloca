'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ExternalLink, Clock, Users, AlertCircle, Loader2, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useGooglePlaces } from './hooks/useGooglePlaces';
import { Recipe, ParseRecipeResponse, ParseRecipeError, RecipeAnalysis, UnifiedAnalysisResponse } from './types/recipe';
import ChatModal from './components/ChatModal';

// You'll need to set this in your environment variables
const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function Home() {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipeAnalysis, setRecipeAnalysis] = useState<RecipeAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false);
  const [localAlternativesHeight, setLocalAlternativesHeight] = useState(256); // Default fallback height
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const localAlternativesRef = useRef<HTMLDivElement>(null);
  const { inputRef, isLoaded, selectedPlace, setSelectedPlace } = useGooglePlaces(GOOGLE_PLACES_API_KEY);

  // Update city state when a place is selected
  useEffect(() => {
    if (selectedPlace) {
      // Use the full formatted address to provide geographic context
      // This ensures we distinguish between cities with the same name (e.g., Paris, France vs Paris, Texas)
      setCity(selectedPlace.formatted_address);
    }
  }, [selectedPlace]);

  const generateRecipeAnalysis = useCallback(async () => {
    if (!recipe || !city) return;

    setAnalysisLoading(true);
    setAnalysisError(null);
    
    try {
      const response = await fetch('/api/analyze-recipe', {
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
          region: selectedPlace?.formatted_address?.split(',').slice(1).join(',').trim() || undefined,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please check your API configuration.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze recipe');
      }

      const successData = data as UnifiedAnalysisResponse;
      setRecipeAnalysis(successData.analysis);
    } catch (err) {
      console.error('Analysis error:', err);
      
      // Handle different types of errors
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
    } finally {
      setAnalysisLoading(false);
    }
  }, [recipe, city, selectedPlace]);

  // Generate recipe analysis when we have both recipe and city
  useEffect(() => {
    if (recipe && city && recipe.ingredients.length > 0) {
      generateRecipeAnalysis();
    }
  }, [recipe, city, generateRecipeAnalysis]);

  // Measure Local Alternatives height to match Original Recipe collapsed height
  useEffect(() => {
    if (localAlternativesRef.current && recipeAnalysis && !isRecipeExpanded) {
      // Add a small delay to ensure content is fully rendered
      const timer = setTimeout(() => {
        if (localAlternativesRef.current) {
          const height = localAlternativesRef.current.offsetHeight;
          // Reduce the height to make tiles smaller and eliminate white space
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
    
    // Clear selected place if user is typing manually and it doesn't match the formatted address
    if (selectedPlace && value !== selectedPlace.formatted_address) {
      setSelectedPlace(null);
    }
  };

  const handleExpandToggle = () => {
    setIsRecipeExpanded(!isRecipeExpanded);
    // Reset height measurement when expanding
    if (isRecipeExpanded) {
      setLocalAlternativesHeight(256);
    }
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
              {/* Original Recipe - Collapsible */}
              <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm relative">
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
                
                                 <div 
                   className={`p-4 space-y-4 ${!isRecipeExpanded ? 'overflow-hidden' : ''}`}
                   style={!isRecipeExpanded && localAlternativesHeight > 0 ? { maxHeight: `${localAlternativesHeight}px` } : {}}
                 >
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
                 
                 {/* Gradient overlay and expand button when collapsed */}
                 {!isRecipeExpanded && (
                   <>
                     <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                     <button
                       onClick={handleExpandToggle}
                       className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-lg transition-colors border border-gray-200/50 shadow-sm"
                     >
                       <ChevronDown className="h-3 w-3" />
                       Expand
                     </button>
                   </>
                 )}
                 
                 {/* Collapse button when expanded */}
                 {isRecipeExpanded && (
                   <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                     <button
                       onClick={handleExpandToggle}
                       className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-lg transition-colors border border-gray-200/50 shadow-sm"
                     >
                       <ChevronUp className="h-3 w-3" />
                       Collapse
                     </button>
                   </div>
                 )}
              </div>

                             {/* Local Suggestions */}
               <div ref={localAlternativesRef} className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-playfair text-lg font-bold text-sage-green">
                    🧑‍🍳 Local Alternatives
                  </h2>
                  <p className="text-gray-600 text-xs mt-1">
                    <span className="font-medium">Location:</span> {city}
                  </p>
                </div>
                
                                 <div className="p-3">
                   {analysisLoading && (
                     <div className="flex items-center gap-2 py-4">
                       <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                       <span className="text-green-600 font-medium text-sm">Analyzing recipe...</span>
                     </div>
                   )}
                  
                  {/* Analysis Error */}
                  {analysisError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-800 text-sm">Error analyzing recipe</h4>
                          <p className="text-red-700 text-xs mt-1">{analysisError}</p>
                          {analysisError.includes('API key') && (
                            <p className="text-red-600 text-xs mt-1">
                              Check your .env.local file and ensure OPENAI_API_KEY is set correctly.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                                                                            {/* Unified Analysis Display */}
                    {recipeAnalysis && (
                      <div className="space-y-2">
                       {/* Avoiding Processed */}
                       {recipeAnalysis.substitutions.avoidingProcessed && (
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                           <div className="flex items-start gap-2">
                             <span className="text-orange-500 text-sm">✓</span>
                             <div>
                               <h4 className="font-medium text-gray-900 text-sm mb-1">Avoiding Processed Foods</h4>
                               <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.avoidingProcessed}</p>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* Seasonal Substitutions */}
                       {recipeAnalysis.substitutions.seasonal.length > 0 && (
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                           <div className="flex items-start gap-2">
                             <span className="text-green-500 text-sm">📅</span>
                             <div>
                               <h4 className="font-medium text-gray-900 text-sm mb-1">Seasonal Ingredients</h4>
                               <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.seasonal[0]}</p>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* Hyper Local Substitutions */}
                       {recipeAnalysis.substitutions.hyperLocal.length > 0 && (
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                           <div className="flex items-start gap-2">
                             <span className="text-blue-500 text-sm">📍</span>
                             <div>
                               <h4 className="font-medium text-gray-900 text-sm mb-1">Local Ingredients ({city.split(',')[0]})</h4>
                               <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.hyperLocal[0]}</p>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* Regional Substitutions */}
                       {recipeAnalysis.substitutions.regional.length > 0 && (
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                           <div className="flex items-start gap-2">
                             <span className="text-blue-500 text-sm">📍</span>
                             <div>
                               <h4 className="font-medium text-gray-900 text-sm mb-1">Regional Ingredients ({city.split(',').slice(1).join(',').trim() || 'region'})</h4>
                               <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.substitutions.regional[0]}</p>
                             </div>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                  {/* No analysis available */}
                  {!analysisLoading && !analysisError && !recipeAnalysis && recipe && city && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1 text-sm">No Analysis Available</h3>
                      <p className="text-gray-600 text-xs">
                        Unable to analyze this recipe for local alternatives in {city}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Sections */}
            <div className="mt-8 space-y-6">
                             {/* The Chef's Perspective */}
               <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                 <div className="p-4 border-b border-gray-100">
                   <h2 className="font-playfair text-lg font-bold text-sage-green">
                     👨‍🍳 The Chef&apos;s Perspective
                   </h2>
                 </div>
                                   <div className="p-4 space-y-6">
                                        {/* What The Chef Would Appreciate Sub-section */}
                    <div>
                      <h3 className="font-playfair text-base font-semibold text-sage-green mb-4 border-b border-gray-100 pb-2">What The Chef Would Appreciate</h3>
                      {recipeAnalysis ? (
                        <div className="space-y-3">
                                                                                 {/* Technique to Appreciate */}
                            <div className="bg-cream/50 border-l-4 border-sage-green rounded-lg p-3 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-sage-green/5 to-transparent pointer-events-none"></div>
                              <div className="flex items-start gap-2 relative z-10">
                                <span className="text-sage-green text-sm font-bold">🔪</span>
                                <div>
                                  <h4 className="font-medium text-sage-green text-sm mb-1">Technique</h4>
                                                                     <p className="text-gray-700 text-xs leading-relaxed">{recipeAnalysis.techniqueAnalysis.appreciate.replace(/\s*\*\s*$/, '')}</p>
                                </div>
                              </div>
                            </div>
                           
                                                       {/* Flavor Alignments */}
                            {recipeAnalysis.flavorPairings.alignments.map((alignment, index) => (
                              <div key={index} className="bg-cream/20 border-l-4 border-sage-green/70 rounded-lg p-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(123,138,114,0.03)_0%,transparent_50%)] pointer-events-none"></div>
                                <div className="flex items-start gap-2 relative z-10">
                                  <span className="text-sage-green/70 text-base">🍋</span>
                                  <div>
                                    <h4 className="font-medium text-sage-green text-sm mb-1">Flavor Alignment</h4>
                                    <p className="text-gray-700 text-xs leading-relaxed">{alignment}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1 text-sm">Analyzing chef insights...</h4>
                          <p className="text-gray-600 text-xs">
                            Professional chef appreciation and feedback for this recipe.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* What The Chef Might Critique Sub-section */}
                    <div>
                      <h3 className="font-playfair text-base font-semibold text-sage-green mb-4 border-b border-gray-100 pb-2">What The Chef Might Critique</h3>
                      {recipeAnalysis ? (
                        <div className="space-y-3">
                                                                                 {/* Technique to Improve */}
                            <div className="bg-gray-100/50 border-l-4 border-gray-400 rounded-lg p-3 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/5 to-transparent pointer-events-none"></div>
                              <div className="flex items-start gap-2 relative z-10">
                                <span className="text-gray-500 text-sm font-bold">🔪</span>
                                <div>
                                  <h4 className="font-medium text-gray-700 text-sm mb-1">Technique</h4>
                                  <p className="text-gray-600 text-xs leading-relaxed">{recipeAnalysis.techniqueAnalysis.improve}</p>
                                </div>
                              </div>
                            </div>
                           
                                                       {/* Suggested Enhancement */}
                            <div className="bg-gray-100/30 border-l-4 border-gray-400/70 rounded-lg p-3 relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(107,114,128,0.03)_0%,transparent_50%)] pointer-events-none"></div>
                              <div className="flex items-start gap-2 relative z-10">
                                <span className="text-gray-500/70 text-base">🍋</span>
                                <div>
                                                                     <h4 className="font-medium text-gray-700 text-sm mb-1">Flavor Enhancement</h4>
                                  <p className="text-gray-600 text-xs leading-relaxed">{recipeAnalysis.flavorPairings.enhancement}</p>
                                </div>
                              </div>
                            </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1 text-sm">Analyzing improvement areas...</h4>
                          <p className="text-gray-600 text-xs">
                            Professional chef critique and enhancement suggestions for this recipe.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>

              {/* User Reviews */}
              <div className="bg-white rounded-lg border border-sage-green/20 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-playfair text-lg font-bold text-sage-green">
                    ⭐ User Reviews
                  </h2>
                </div>
                <div className="p-4">
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 text-sm">Coming Soon</h3>
                    <p className="text-gray-600 text-xs">
                      Community reviews and ratings for this recipe.
                    </p>
                  </div>
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
