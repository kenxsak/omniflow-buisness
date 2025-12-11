/**
 * Geo-detection API endpoint
 * Uses request headers to detect user's country
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Try Cloudflare headers (available on many platforms including Replit)
    const cfCountry = request.headers.get('cf-ipcountry');
    
    // Try X-Forwarded-For for IP-based detection
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0].trim() || request.headers.get('x-real-ip');
    
    if (cfCountry && cfCountry !== 'XX') {
      return NextResponse.json({
        country: getCountryName(cfCountry),
        countryCode: cfCountry,
        source: 'cloudflare',
      });
    }
    
    // If we have an IP, try to detect country using a free IP geolocation service
    if (ip && !ip.startsWith('127.') && !ip.startsWith('192.168.')) {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'OmniFlow/1.0' },
        });
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.country_code) {
            return NextResponse.json({
              country: geoData.country_name || getCountryName(geoData.country_code),
              countryCode: geoData.country_code,
              source: 'ipapi',
            });
          }
        }
      } catch (error) {
        console.error('IP geolocation failed:', error);
      }
    }
    
    // Default to US if detection fails
    return NextResponse.json({
      country: 'United States',
      countryCode: 'US',
      source: 'default',
    });
  } catch (error) {
    console.error('Geo-detection error:', error);
    return NextResponse.json({
      country: 'United States',
      countryCode: 'US',
      source: 'error_fallback',
    });
  }
}

function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'ES': 'Spain',
    'IT': 'Italy',
    'CA': 'Canada',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'PH': 'Philippines',
    'TH': 'Thailand',
    'ID': 'Indonesia',
    'VN': 'Vietnam',
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'HK': 'Hong Kong',
    'TW': 'Taiwan',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'EG': 'Egypt',
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'IL': 'Israel',
    'TR': 'Turkey',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'PL': 'Poland',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'IE': 'Ireland',
    'PT': 'Portugal',
    'GR': 'Greece',
    'CZ': 'Czech Republic',
    'RO': 'Romania',
    'HU': 'Hungary',
    'BG': 'Bulgaria',
  };
  
  return countries[countryCode.toUpperCase()] || countryCode;
}
