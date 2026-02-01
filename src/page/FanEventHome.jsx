import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Radio, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCities } from '@/hooks/useCities';
import RotatingAdSpot from '@/components/RotatingAdSpot';
import { ADS_CONFIG } from '@/config/adConfig';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

// Mapping of state codes to full names for display
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
};

function FanEventHome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Add fallback empty array to prevent map errors if hook returns undefined
  const { states = [], getCitiesByState, loading: loadingCities, error: citiesError } = useCities() || {};

  const [selectedState, setSelectedState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [radius, setRadius] = useState(25);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!selectedState || !getCitiesByState) return [];
    
    // Safety check for getCitiesByState
    const stateCities = getCitiesByState(selectedState) || [];
    
    if (!searchQuery) {
      return stateCities;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    return stateCities.filter(c => 
      c.city_name.toLowerCase().includes(lowerQuery)
    );
  }, [selectedState, searchQuery, getCitiesByState]);

  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setSearchQuery('');
    setSelectedCity(null);
    setShowCityDropdown(false);
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setSearchQuery(city.city_name);
    setShowCityDropdown(false);
  };

  const handleSearch = () => {
    if (!selectedState) {
      toast({
        variant: 'destructive',
        title: 'State Required',
        description: 'Please select a state to search for events.'
      });
      return;
    }

    if (!selectedCity && !searchQuery) {
      toast({
        variant: 'destructive',
        title: 'City Required',
        description: 'Please enter a city to search for events.'
      });
      return;
    }

    // Use selected city data if available, otherwise fall back to text input
    const cityParam = selectedCity ? selectedCity.city_name : searchQuery;
    
    const params = new URLSearchParams({
      state: selectedState,
      city: cityParam,
      radius: radius.toString()
    });

    if (selectedCity) {
        params.append('lat', selectedCity.lat);
        params.append('lng', selectedCity.lng);
    }

    navigate(`/fans/results?${params.toString()}`);
  };

  return (
    <>
      <Helmet>
        <title>Find Live Events Near You - Black Label Entertainment</title>
        <meta
          name="description"
          content="Discover concerts, shows, and live entertainment events in your area"
        />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-12">
            <RotatingAdSpot 
              ads={ADS_CONFIG} 
              className="mb-8"
              interval={7000}
            />

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] bg-clip-text text-transparent">
              Find Shows Near You
            </h1>
            <p className="text-gray-400 text-lg">
              Discover live concerts and events in your area
            </p>
          </div>

          <motion.div
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-[#D4AF37]/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {citiesError ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-200">
                  <p className="font-semibold">Unable to load location data</p>
                  <p>Please check your connection and refresh the page.</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  State
                </label>
                <div className="relative">
                  <select
                    value={selectedState}
                    onChange={handleStateChange}
                    disabled={loadingCities}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                  >
                    <option value="" className="bg-[#1a1a1a]">
                      {loadingCities ? 'Loading states...' : 'Select State'}
                    </option>
                    {(states || []).map(s => (
                      <option key={s.value} value={s.value} className="bg-[#1a1a1a]">
                        {STATE_NAMES[s.value] || s.value}
                      </option>
                    ))}
                  </select>
                  {loadingCities && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-50" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#D4AF37]" />
                  City
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedState) setShowCityDropdown(true);
                    setSelectedCity(null); // Clear selection when typing
                  }}
                  onFocus={() => {
                    if (selectedState) setShowCityDropdown(true);
                  }}
                  onClick={() => {
                    if (selectedState) setShowCityDropdown(true);
                  }}
                  placeholder={selectedState ? "Type to search cities..." : "Select a state first"}
                  disabled={!selectedState || loadingCities}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ pointerEvents: 'auto' }}
                />
                
                <AnimatePresence>
                  {showCityDropdown && selectedState && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                    >
                      {filteredCities.length > 0 ? (
                        filteredCities.map((city) => (
                          <div
                            key={city.id}
                            onClick={() => handleCitySelect(city)}
                            className="px-4 py-3 hover:bg-[#D4AF37]/20 cursor-pointer text-white transition-colors border-b border-gray-800 last:border-0 flex justify-between items-center"
                          >
                            <span>{city.city_name}</span>
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                              {city.state}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center text-sm">
                          {searchQuery ? "No cities found matching your search" : "Type to see cities"}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#D4AF37]" />
                  Search Radius
                </label>
                <div className="flex flex-wrap gap-3">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        radius === r
                          ? 'bg-[#D4AF37] text-black shadow-lg scale-105'
                          : 'bg-black/40 text-gray-300 hover:bg-[#D4AF37]/20 border border-gray-700'
                      }`}
                    >
                      {r} mi
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSearch}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black font-bold py-4 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Events
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button
              onClick={() => navigate('/fans/submit')}
              className="text-[#D4AF37] hover:text-[#f4d03f] font-medium transition-colors underline-offset-4 hover:underline"
            >
              Submit a show
            </button>
            <span className="hidden sm:block text-gray-600">•</span>
            <button
              onClick={() => navigate('/fans/submit')}
              className="text-[#D4AF37] hover:text-[#f4d03f] font-medium transition-colors underline-offset-4 hover:underline"
            >
              I'm a venue/promoter
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

export default FanEventHome;
