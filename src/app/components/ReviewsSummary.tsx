'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface ReviewsSummaryProps {
  recipe: {
    name: string;
    description?: string;
  };
}

export default function ReviewsSummary({ recipe }: ReviewsSummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReviewSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze-reviews', {
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate review summary');
      }

      setSummary(data.summary);
    } catch (err) {
      console.error('Review summary error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  }, [recipe]);

  useEffect(() => {
    if (recipe?.name) {
      generateReviewSummary();
    }
  }, [recipe, generateReviewSummary]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating review summary...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-gray-500 text-sm">
        Unable to load review summary at this time.
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-gray-500 text-sm">
        No review summary available.
      </div>
    );
  }

  return (
    <div className="text-gray-700 text-sm leading-relaxed">
      {summary}
    </div>
  );
}
