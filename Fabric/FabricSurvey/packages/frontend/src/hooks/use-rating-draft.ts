import { useState } from 'react';
import { RESPONSE_DIMENSIONS, type ResponseDimension } from '@rayfin-app/shared';

type Ratings = Record<ResponseDimension, number | null>;

const NO_RATINGS: Ratings = { accuracy: null, usefulness: null, completeness: null, clarity: null };

/** The parts of an answer rating both rating forms share: four scores, a comment, screenshots. */
export function useRatingDraft() {
  const [ratings, setRatings] = useState<Ratings>(NO_RATINGS);
  const [comment, setComment] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);

  return {
    ratings,
    rate: (key: ResponseDimension, value: number) => setRatings((r) => ({ ...r, [key]: value })),
    comment,
    setComment,
    screenshots,
    setScreenshots,
    /** Labels of the scores not yet given. */
    missingRatings: RESPONSE_DIMENSIONS.filter((d) => ratings[d.key] === null).map((d) => d.label.toLowerCase()),
    /** The scores, once all four are set. */
    completeRatings: ratings as Record<ResponseDimension, number>,
    reset() {
      setRatings(NO_RATINGS);
      setComment('');
      setScreenshots([]);
    },
  };
}
