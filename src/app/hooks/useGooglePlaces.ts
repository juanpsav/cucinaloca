import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface PlaceResult {
  formatted_address: string;
  place_id: string;
  name: string;
  address_components?: google.maps.GeocoderAddressComponent[];
}

export const useGooglePlaces = (apiKey: string) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isLoadingRef = useRef(false);
  const mapsActuallyLoaded = useRef(false);
  const [isLoaded, setIsLoaded] = useState(!apiKey); // ready immediately if no key
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // When apiKey is absent from the start, isLoaded initialises to true above.
  // If apiKey arrives late (unlikely but safe to handle), sync here.
  useEffect(() => {
    if (!apiKey && !isLoaded) setIsLoaded(true);
  }, [apiKey, isLoaded]);

  const loadMapsApi = useCallback(() => {
    if (isLoaded || isLoadingRef.current || !apiKey) return;

    isLoadingRef.current = true;
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      mapsActuallyLoaded.current = true;
      setIsLoaded(true);
      isLoadingRef.current = false;
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
      // Degrade gracefully — city field still works as plain text
      setIsLoaded(true);
      isLoadingRef.current = false;
    });
  }, [apiKey, isLoaded]);

  useEffect(() => {
    // Only initialise autocomplete when Google Maps actually loaded
    if (isLoaded && mapsActuallyLoaded.current && inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['(cities)'],
          fields: ['formatted_address', 'place_id', 'name', 'address_components'],
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          setSelectedPlace({
            formatted_address: place.formatted_address,
            place_id: place.place_id || '',
            name: place.name || '',
            address_components: place.address_components,
          });
        }
      });
    }

    return () => {
      if (autocompleteRef.current && mapsActuallyLoaded.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  return {
    inputRef,
    isLoaded,
    selectedPlace,
    setSelectedPlace,
    loadMapsApi,
  };
};
