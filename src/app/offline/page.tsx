'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center text-white">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <WifiOff className="w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">You're Offline</h1>
        
        <p className="text-lg mb-6 text-white/90">
          It looks like you've lost your internet connection. Don't worry, OmniFlow will work again once you're back online.
        </p>
        
        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <p className="text-sm text-white/80">
            <strong>What you can do:</strong>
          </p>
          <ul className="text-sm text-left mt-2 space-y-2 text-white/80">
            <li>• Check your internet connection</li>
            <li>• Some cached pages may still be available</li>
            <li>• Your work will sync when you're back online</li>
          </ul>
        </div>
        
        <Button
          onClick={() => window.location.reload()}
          className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold py-6 text-lg"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Try Again
        </Button>
        
        <p className="text-xs mt-6 text-white/60">
          OmniFlow works best with an active internet connection
        </p>
      </div>
    </div>
  );
}
