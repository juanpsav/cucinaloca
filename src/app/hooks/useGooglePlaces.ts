import { useEffect, useRef, useState } from 'react';
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      setIsLoaded(true);
    });
  }, [apiKey]);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      // Initialize autocomplete with city/locality restrictions
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['(cities)'], // Restrict to cities only
          fields: ['formatted_address', 'place_id', 'name', 'address_components'],
        }
      );

      // Listen for place selection
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
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  return {
    inputRef,
    isLoaded,
    selectedPlace,
    setSelectedPlace,
  };
}; 