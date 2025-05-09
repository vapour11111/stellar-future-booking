import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, Navigation, Info, Route } from "lucide-react";

// Add Google Maps type definitions
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

type GoogleMapProps = {
  destinationLat: number | null;
  destinationLng: number | null;
  locationName: string;
};

const GoogleMap = ({ destinationLat, destinationLng, locationName }: GoogleMapProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [distanceInfo, setDistanceInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const mapLoaded = useRef<boolean>(false);
  
  // Google Maps API key - ensure this is correct
  const API_KEY = "AIzaSyDhZOqoqZhZWMKJxHGOQpgZqQEHoQQm5Hs";

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Got user position:", latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Unable to get your location. Please enable location services.");
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
    }
  }, []);

  // Function to initialize map
  const initializeMap = () => {
    if (!mapRef.current || !userLocation || !destinationLat || !destinationLng) return;
    
    try {
      // Create map instance
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.lat, lng: userLocation.lng },
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }]
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }]
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }]
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }]
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }]
          }
        ]
      });

      // Create directions service and renderer
      const directionsService = new window.google.maps.DirectionsService();
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#5D8BF4",
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });

      // Get directions
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
          destination: new window.google.maps.LatLng(destinationLat, destinationLng),
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.current?.setDirections(result);
            
            const route = result.routes[0];
            if (route && route.legs[0]) {
              setDistanceInfo({
                distance: route.legs[0].distance?.text || "Unknown",
                duration: route.legs[0].duration?.text || "Unknown"
              });
            }
            setIsLoading(false);
          } else {
            console.error("Directions request failed:", status);
            setError("Unable to get directions to this location");
            setIsLoading(false);
          }
        }
      );
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to load the map. Please try again later.");
      setIsLoading(false);
    }
  };

  // Load Google Maps script and initialize map
  useEffect(() => {
    // Check if destination coordinates are available
    if (destinationLat === null || destinationLng === null) {
      setError("Location coordinates not available");
      setIsLoading(false);
      return;
    }

    // Don't proceed if user location is not available yet
    if (!userLocation) return;

    // Function to initialize map once script is loaded
    window.initMap = () => {
      console.log("Google Maps API loaded successfully");
      mapLoaded.current = true;
      initializeMap();
    };

    // Check if script is already loaded
    const existingScript = document.getElementById("google-maps-script");
    if (!existingScript) {
      console.log("Loading Google Maps script with API key:", API_KEY);
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error("Google Maps script failed to load");
        setError("Failed to load Google Maps. Please check your internet connection and try again.");
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    } else if (mapLoaded.current) {
      // Script already loaded, initialize map directly
      initializeMap();
    }

    // Cleanup function
    return () => {
      // Only remove the script if we added it in this component
      const script = document.getElementById("google-maps-script");
      if (script && script.parentNode && !mapLoaded.current) {
        script.parentNode.removeChild(script);
      }
      
      // Clear global callback
      if (window.initMap === initializeMap) {
        window.initMap = () => {};
      }
    };
  }, [destinationLat, destinationLng, userLocation]);

  // Open Google Maps app/website for navigation
  const openGoogleMapsNavigation = () => {
    if (destinationLat && destinationLng) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`;
      window.open(mapsUrl, '_blank');
    }
  };

  if (error) {
    return (
      <Card className="border border-destructive/50 shadow-md">
        <CardContent className="pt-6 flex flex-col items-center justify-center h-60">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-center text-destructive">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 bg-muted/20">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-center text-muted-foreground">Loading map...</p>
          </div>
        ) : (
          <div className="relative">
            <div ref={mapRef} className="h-80 w-full"></div>
            
            {distanceInfo && (
              <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-md shadow-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{locationName}</h4>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Route className="h-3.5 w-3.5 mr-1" />
                      <span>{distanceInfo.distance}</span>
                      <span className="mx-1.5">•</span>
                      <span>~{distanceInfo.duration}</span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-1.5 text-xs h-8"
                    onClick={openGoogleMapsNavigation}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Navigate
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleMap;
