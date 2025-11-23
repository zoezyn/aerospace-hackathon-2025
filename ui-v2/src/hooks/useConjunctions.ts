import { useState, useEffect } from 'react';
import { Conjunction } from '@/components/ConjunctionList';

export const useConjunctions = () => {
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConjunctions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/conjunctions_nested.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setConjunctions(data);
      } catch (err) {
        console.error('Error loading conjunctions:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchConjunctions();
  }, []);

  return { conjunctions, loading, error };
};
