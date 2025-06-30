const geolib = require('geolib');
const logger = require('./logger');

/**
 * Calculate distance between two points in kilometers
 * @param {Object} point1 - First point with latitude and longitude
 * @param {Object} point2 - Second point with latitude and longitude
 * @returns {number} Distance in kilometers
 */
const getDistance = (point1, point2) => {
  try {
    return geolib.getDistance(
      { latitude: point1.lat, longitude: point1.lng },
      { latitude: point2.lat, longitude: point2.lng }
    ) / 1000; // Convert meters to kilometers
  } catch (error) {
    logger.error('Error calculating distance', { point1, point2, error: error.message });
    throw new Error('Error calculating distance');
  }
};

/**
 * Check if a point is within a specified radius of another point
 * @param {Object} point - The point to check { lat, lng }
 * @param {Object} center - The center point { lat, lng }
 * @param {number} radius - Radius in kilometers
 * @returns {boolean} True if point is within the radius
 */
const isPointInRadius = (point, center, radius) => {
  try {
    return geolib.isPointWithinRadius(
      { latitude: point.lat, longitude: point.lng },
      { latitude: center.lat, longitude: center.lng },
      radius * 1000 // Convert km to meters
    );
  } catch (error) {
    logger.error('Error checking point in radius', { point, center, radius, error: error.message });
    throw new Error('Error checking point in radius');
  }
};

/**
 * Find all points within a radius of a center point
 * @param {Object} center - The center point { lat, lng }
 * @param {Array} points - Array of points to check
 * @param {number} radius - Radius in kilometers
 * @returns {Array} Array of points within the radius
 */
const findPointsInRadius = (center, points, radius) => {
  try {
    return points.filter(point => 
      isPointInRadius(
        { lat: point.latitude || point.lat, lng: point.longitude || point.lng },
        center,
        radius
      )
    );
  } catch (error) {
    logger.error('Error finding points in radius', { center, radius, error: error.message });
    throw new Error('Error finding points in radius');
  }
};

/**
 * Calculate the center point of multiple coordinates
 * @param {Array} coordinates - Array of coordinate objects with lat and lng
 * @returns {Object} Center point { lat, lng }
 */
const getCenterPoint = (coordinates) => {
  try {
    const points = coordinates.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng
    }));
    
    const center = geolib.getCenter(points);
    return { lat: center.latitude, lng: center.longitude };
  } catch (error) {
    logger.error('Error calculating center point', { coordinates, error: error.message });
    throw new Error('Error calculating center point');
  }
};

/**
 * Calculate the bounds that contain all the given coordinates
 * @param {Array} coordinates - Array of coordinate objects with lat and lng
 * @returns {Object} Bounds object with ne (northeast) and sw (southwest) points
 */
const getBounds = (coordinates) => {
  try {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }
    
    const lats = coordinates.map(coord => coord.lat);
    const lngs = coordinates.map(coord => coord.lng);
    
    return {
      ne: {
        lat: Math.max(...lats),
        lng: Math.max(...lngs)
      },
      sw: {
        lat: Math.min(...lats),
        lng: Math.min(...lngs)
      }
    };
  } catch (error) {
    logger.error('Error calculating bounds', { coordinates, error: error.message });
    throw new Error('Error calculating bounds');
  }
};

/**
 * Convert address to coordinates using a geocoding service
 * @param {string} address - The address to geocode
 * @returns {Promise<Object>} Object with lat and lng
 */
const geocodeAddress = async (address) => {
  try {
    // In a real app, you would use a geocoding service like Google Maps or Mapbox
    // This is a placeholder implementation
    const response = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(address)}`);
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('No results found for this address');
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      formattedAddress: data[0].display_name
    };
  } catch (error) {
    logger.error('Error geocoding address', { address, error: error.message });
    throw new Error('Error geocoding address');
  }
};

/**
 * Convert coordinates to an address (reverse geocoding)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Formatted address
 */
const reverseGeocode = async (lat, lng) => {
  try {
    // In a real app, you would use a reverse geocoding service
    // This is a placeholder implementation
    const response = await fetch(`https://geocode.maps.co/reverse?lat=${lat}&lon=${lng}`);
    const data = await response.json();
    
    if (!data || !data.display_name) {
      throw new Error('No address found for these coordinates');
    }
    
    return data.display_name;
  } catch (error) {
    logger.error('Error reverse geocoding', { lat, lng, error: error.message });
    throw new Error('Error reverse geocoding');
  }
};

/**
 * Calculate the area of a polygon defined by coordinates
 * @param {Array} coordinates - Array of coordinate objects with lat and lng
 * @returns {number} Area in square kilometers
 */
const calculateArea = (coordinates) => {
  try {
    // Convert coordinates to format expected by geolib
    const points = coordinates.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng
    }));
    
    // Close the polygon if not already closed
    if (points.length > 0 && 
        (points[0].latitude !== points[points.length - 1].latitude ||
         points[0].longitude !== points[points.length - 1].longitude)) {
      points.push({...points[0]});
    }
    
    const area = geolib.getAreaOfPolygon(points);
    return area / 1000000; // Convert square meters to square kilometers
  } catch (error) {
    logger.error('Error calculating area', { error: error.message });
    throw new Error('Error calculating area');
  }
};

/**
 * Check if a point is inside a polygon
 * @param {Object} point - The point to check { lat, lng }
 * @param {Array} polygon - Array of coordinate objects with lat and lng defining the polygon
 * @returns {boolean} True if the point is inside the polygon
 */
const isPointInPolygon = (point, polygon) => {
  try {
    const pointToCheck = {
      latitude: point.lat,
      longitude: point.lng
    };
    
    const polygonPoints = polygon.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng
    }));
    
    return geolib.isPointInPolygon(pointToCheck, polygonPoints);
  } catch (error) {
    logger.error('Error checking point in polygon', { point, error: error.message });
    throw new Error('Error checking point in polygon');
  }
};

module.exports = {
  getDistance,
  isPointInRadius,
  findPointsInRadius,
  getCenterPoint,
  getBounds,
  geocodeAddress,
  reverseGeocode,
  calculateArea,
  isPointInPolygon
};
