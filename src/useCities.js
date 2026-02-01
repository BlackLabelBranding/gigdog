import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Removed global caching variable to ensure fresh data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchCities = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching cities from Supabase (Fresh)...');

        const { data, error: fetchError } = await supabase
          .from('cities')
          .select('*')
          .order('state', { ascending: true })
          .order('city_name', { ascending: true });

        if (fetchError) {
          console.error('Supabase error fetching cities:', fetchError);
          throw fetchError;
        }

        if (isMounted) {
          if (!data || data.length === 0) {
            console.warn('No cities found in database');
          } else {
            console.log(`Loaded ${data.length} cities`);
          }
          setCities(data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching cities:', err);
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCities();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize states list to prevent unnecessary re-renders
  const states = useMemo(() => {
    if (!cities.length) return [];
    const uniqueStates = [...new Set(cities.map(c => c.state))].filter(Boolean).sort();
    return uniqueStates.map(stateCode => ({
      value: stateCode,
      label: stateCode
    }));
  }, [cities]);

  // Use useCallback for the filter function
  const getCitiesByState = useCallback((stateCode) => {
    if (!stateCode || !cities.length) return [];
    return cities.filter(city => city.state === stateCode);
  }, [cities]);

  return {
    cities,
    states,
    getCitiesByState,
    loading,
    error
  };
}
