// src/utils/cityCoordinates.js
import { supabase } from '@/lib/customSupabaseClient';

const CITY_COORDS = {
  // keep your existing map as-is...
};

const cache = new Map();

function cleanCityName(input = '') {
  const s = String(input ?? '').trim();
  return s.split(',')[0].trim().replace(/\s+/g, ' ');
}

export async function getCityCoordinates(state, city) {
  const st = String(state ?? '').trim().toUpperCase();
  const ct = cleanCityName(city);

  if (!st || !ct) return null;

  const cacheKey = `${st}|${ct.toLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // 1) Try local static list first
  const stateData = CITY_COORDS[st];
  if (stateData) {
    const normalizedCity = Object.keys(stateData).find(
      key => key.toLowerCase() === ct.toLowerCase()
    );
    if (normalizedCity) {
      const coords = stateData[normalizedCity];
      cache.set(cacheKey, coords);
      return coords;
    }
  }

  // 2) Fallback to Supabase cities table (covers ALL cities)
  const { data, error } = await supabase
    .from('cities')
    .select('lat,lng,city_name,state')
    .eq('state', st)
    .ilike('city_name', `%${ct}%`)
    .limit(1);

  if (error) {
    console.error('[getCityCoordinates] cities lookup error:', error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.lat || !row?.lng) return null;

  const coords = { lat: row.lat, lng: row.lng };
  cache.set(cacheKey, coords);
  return coords;
}
