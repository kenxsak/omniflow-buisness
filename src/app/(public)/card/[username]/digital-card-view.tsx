'use client';

import { useState } from 'react';
import { DigitalCard } from '@/lib/digital-card-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  ExternalLink
} from 'lucide-react';
import { incrementLinkClick } from '@/app/actions/digital-card-actions';
import ContactForm from '@/components/digital-card/contact-form';
import CalendarBookingButton from '@/components/digital-card/calendar-booking-button';
import VoiceChatbotWidget from '@/components/digital-card/voice-chatbot-widget';

interface DigitalCardViewProps {
  card: DigitalCard;
}

export default function DigitalCardView({ card }: DigitalCardViewProps) {
  const handleLinkClick = async (linkId: string) => {
    await incrementLinkClick(card.id, linkId);
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      case 'facebook':
        return <Facebook className="h-5 w-5" />;
      case 'twitter':
        return <Twitter className="h-5 w-5" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />;
      case 'youtube':
        return <Youtube className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'phone':
        return <Phone className="h-5 w-5" />;
      case 'website':
        return <Globe className="h-5 w-5" />;
      case 'maps':
        return <MapPin className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  const theme = card.branding.theme || 'modern';
  const primaryColor = card.branding.primaryColor || '#3B82F6';
  const secondaryColor = card.branding.secondaryColor || '#10B981';

  return (
    <>
      {/* Voice Chatbot Widget - Only loads if enabled */}
      {card.voiceChatbot?.enabled && (
        <VoiceChatbotWidget
          config={card.voiceChatbot}
          businessName={card.businessInfo.name}
          primaryColor={primaryColor}
          fontFamily={card.branding.fontFamily || 'Inter, sans-serif'}
          cardId={card.id}
          companyId={card.companyId}
        />
      )}

      <div 
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4"
        style={{
          fontFamily: card.branding.fontFamily || 'Inter, sans-serif'
        }}
      >
        <div className="max-w-2xl mx-auto">
        {card.businessInfo.coverImage && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-lg bg-gray-100">
            <div className="relative w-full aspect-[2.6/1]">
              <img
                src={card.businessInfo.coverImage}
                alt={card.businessInfo.name}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
          </div>
        )}

        <Card className="p-8 shadow-xl rounded-2xl bg-white">
          <div className="text-center mb-8">
            {card.businessInfo.logo && (
              <div className="mb-4 flex justify-center">
                <img
                  src={card.businessInfo.logo}
                  alt={`${card.businessInfo.name} logo`}
                  className="w-24 h-24 rounded-full object-cover shadow-md"
                />
              </div>
            )}

            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: primaryColor }}
            >
              {card.businessInfo.name}
            </h1>

            {card.businessInfo.tagline && (
              <p className="text-lg text-gray-600 mb-3">{card.businessInfo.tagline}</p>
            )}

            {card.businessInfo.description && (
              <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">
                {card.businessInfo.description}
              </p>
            )}

            {card.businessInfo.category && (
              <span 
                className="inline-block mt-4 px-4 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${primaryColor}20`,
                  color: primaryColor
                }}
              >
                {card.businessInfo.category}
              </span>
            )}
          </div>

          {card.links && card.links.length > 0 && (
            <div className="space-y-3 mb-8">
              {card.links
                .filter(link => link.enabled)
                .sort((a, b) => a.order - b.order)
                .map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleLinkClick(link.id)}
                    className="block"
                  >
                    <Button
                      className="w-full h-14 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                      style={{
                        backgroundColor: primaryColor,
                        color: 'white'
                      }}
                    >
                      <span className="mr-2">{getLinkIcon(link.type)}</span>
                      {link.label}
                    </Button>
                  </a>
                ))}
            </div>
          )}

          {/* Contact Form - Only show if enabled */}
          {card.contactForm?.enabled !== false && (
            <div className="mb-4">
              <ContactForm
                cardId={card.id}
                businessName={card.businessInfo.name}
                buttonText={card.contactForm?.buttonText}
                formTitle={card.contactForm?.title}
                formDescription={card.contactForm?.description}
                primaryColor={primaryColor}
                variant="default"
                size="lg"
                showIcon={true}
              />
            </div>
          )}

          {/* Calendar Booking - Only show if enabled and configured */}
          {card.calendarBooking?.enabled && card.calendarBooking?.calcomUsername && (
            <div className="mb-8">
              <CalendarBookingButton
                buttonText={card.calendarBooking?.buttonText}
                calcomUsername={card.calendarBooking?.calcomUsername}
                calcomEventSlug={card.calendarBooking?.calcomEventSlug}
                primaryColor={primaryColor}
                variant="outline"
                size="lg"
                showIcon={true}
              />
            </div>
          )}

          {card.contact && (
            <div className="space-y-3 mb-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-4" style={{ color: primaryColor }}>
                Contact Information
              </h3>
              
              {card.contact.phone && (
                <a
                  href={`tel:${card.contact.phone}`}
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                  <span>{card.contact.phone}</span>
                </a>
              )}

              {card.contact.email && (
                <a
                  href={`mailto:${card.contact.email}`}
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                  <span>{card.contact.email}</span>
                </a>
              )}

              {card.contact.address && (
                <div className="flex items-start gap-3 text-gray-700">
                  <MapPin className="h-5 w-5 mt-0.5" style={{ color: primaryColor }} />
                  <span>{card.contact.address}</span>
                </div>
              )}
            </div>
          )}

          {card.socialMedia && Object.values(card.socialMedia).some(v => v) && (
            <div className="border-t pt-6">
              <h3 className="text-center text-sm font-medium text-gray-600 mb-4">
                Follow Us
              </h3>
              <div className="flex justify-center gap-4 flex-wrap">
                {card.socialMedia.instagram && (
                  <a
                    href={`https://instagram.com/${card.socialMedia.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                )}
                {card.socialMedia.facebook && (
                  <a
                    href={`https://facebook.com/${card.socialMedia.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    <Facebook className="h-6 w-6" />
                  </a>
                )}
                {card.socialMedia.twitter && (
                  <a
                    href={`https://twitter.com/${card.socialMedia.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    <Twitter className="h-6 w-6" />
                  </a>
                )}
                {card.socialMedia.linkedin && (
                  <a
                    href={card.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    <Linkedin className="h-6 w-6" />
                  </a>
                )}
                {card.socialMedia.youtube && (
                  <a
                    href={card.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    <Youtube className="h-6 w-6" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Powered by <span className="font-semibold">OmniFlow</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create your own digital card at omniflow.app
            </p>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}
