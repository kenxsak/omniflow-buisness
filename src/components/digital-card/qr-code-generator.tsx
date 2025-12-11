'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  cardUrl: string;
  cardName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export default function QRCodeGenerator({ 
  cardUrl, 
  cardName,
  variant = 'outline',
  size = 'default'
}: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateQRCode = async () => {
    setGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(cardUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && !qrCodeDataUrl) {
      generateQRCode();
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `${cardName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <QrCode className="h-4 w-4 mr-2" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {cardName}</DialogTitle>
          <DialogDescription>
            Download and share this QR code to let people access your digital card instantly
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {generating ? (
            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : qrCodeDataUrl ? (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code for ${cardName}`}
                  className="w-64 h-64"
                />
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code (PNG)
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  Print this QR code on business cards, flyers, or posters
                </p>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
