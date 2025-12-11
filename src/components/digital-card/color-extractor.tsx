'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractColorsFromImage, isValidImageUrl } from '@/lib/color-extraction';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';

interface ColorExtractorProps {
  logoUrl: string;
  onColorsExtracted: (colors: { primary: string; secondary: string }) => void;
}

export function ColorExtractor({ logoUrl, onColorsExtracted }: ColorExtractorProps) {
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string } | null>(null);

  const handleExtractColors = async () => {
    setError(null);
    setSuccess(false);
    
    if (!logoUrl) {
      setError('Please add a logo URL first');
      return;
    }

    if (!isValidImageUrl(logoUrl)) {
      setError('Please enter a valid image URL (jpg, png, gif, webp, etc.)');
      return;
    }

    setExtracting(true);
    
    try {
      const colors = await extractColorsFromImage(logoUrl);
      setExtractedColors(colors);
      onColorsExtracted(colors);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Color extraction error:', err);
      setError(err.message || 'Failed to extract colors. Make sure the image URL is accessible.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 mt-0.5 text-purple-600" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Auto-Extract Colors from Logo</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Let AI analyze your logo and automatically pick the perfect brand colors
          </p>
          
          {extractedColors && (
            <div className="mb-3 p-3 bg-white rounded-md border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Colors:</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border border-gray-200" 
                    style={{ backgroundColor: extractedColors.primary }}
                  />
                  <span className="text-sm font-mono">{extractedColors.primary}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border border-gray-200" 
                    style={{ backgroundColor: extractedColors.secondary }}
                  />
                  <span className="text-sm font-mono">{extractedColors.secondary}</span>
                </div>
              </div>
            </div>
          )}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExtractColors}
            disabled={extracting || !logoUrl}
            className="w-full bg-white"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Logo...
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Colors Applied!
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Colors from Logo
              </>
            )}
          </Button>
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          
          {!logoUrl && (
            <p className="text-xs text-amber-600 mt-2">
              💡 Add a logo URL in the Basic Info tab first, then come back here to extract colors
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
