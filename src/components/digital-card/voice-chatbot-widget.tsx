'use client';

import { useEffect, useState } from 'react';
import { VoiceChatbotConfig } from '@/lib/digital-card-types';
import { getVoiceChatConfig } from '@/app/actions/voice-chat-actions';

interface VoiceChatbotWidgetProps {
  config: VoiceChatbotConfig;
  businessName: string;
  primaryColor: string;
  fontFamily: string;
  cardId: string;
  companyId: string;
}

export default function VoiceChatbotWidget({
  config,
  businessName,
  primaryColor,
  fontFamily,
  cardId,
  companyId
}: VoiceChatbotWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [companyConfig, setCompanyConfig] = useState<any>(null);

  useEffect(() => {
    async function loadCompanyConfig() {
      if (!config?.enabled) {
        setIsLoading(false);
        return;
      }

      if (!companyId) {
        console.log('No companyId provided for Voice Chat widget');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getVoiceChatConfig(companyId);
        
        if (result && result.success && result.config?.enabled) {
          setCompanyConfig(result.config);
        } else {
          console.log('Voice Chat AI not configured for this company');
        }
      } catch (error) {
        console.error('Error loading Voice Chat config:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanyConfig();
  }, [companyId, config?.enabled]);

  useEffect(() => {
    if (isLoading || !companyConfig?.widgetScript) {
      return;
    }

    console.log('🎤 Loading Voice Chat AI widget for card:', cardId);

    const greeting = config.customGreeting || `Hi! I'm ${businessName}'s AI assistant. How can I help you today?`;
    const position = config.position || 'right';

    (window as any).OmniFlowVoiceChat = {
      cardId: cardId,
      businessName: businessName,
      greeting: greeting,
      position: `bottom-${position}`,
      theme: {
        primaryColor: primaryColor,
        fontFamily: fontFamily,
      },
      metadata: {
        cardId: cardId,
        businessName: businessName,
        companyId: companyId,
      }
    };

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = companyConfig.widgetScript.trim();
    
    const scriptElement = tempDiv.querySelector('script');
    
    if (scriptElement) {
      const script = document.createElement('script');
      
      if (scriptElement.src) {
        script.src = scriptElement.src;
      }
      
      if (scriptElement.innerHTML) {
        script.innerHTML = scriptElement.innerHTML;
      }

      Array.from(scriptElement.attributes).forEach(attr => {
        script.setAttribute(attr.name, attr.value);
      });

      script.async = true;
      script.onload = () => {
        console.log('✅ Voice Chat AI widget loaded successfully');
      };
      script.onerror = () => {
        console.error('❌ Failed to load Voice Chat AI widget');
      };

      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        delete (window as any).OmniFlowVoiceChat;
      };
    } else {
      console.error('❌ No script tag found in widget code');
    }
  }, [isLoading, companyConfig, config, businessName, primaryColor, fontFamily, cardId, companyId]);

  return null;
}
