'use client';

import { memo } from 'react';
import SkeletonCard from './SkeletonCard';

interface ReviewsSummaryProps {
  summary: string | null;
  isLoading: boolean;
}

const ReviewsSummary = memo(function ReviewsSummary({ summary, isLoading }: ReviewsSummaryProps) {
  if (isLoading) {
    return (
      <div role="status" aria-live="polite">
        <SkeletonCard lines={3} />
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
});

export default ReviewsSummary;
