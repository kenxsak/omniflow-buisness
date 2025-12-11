'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Code2, Info, AlertCircle } from 'lucide-react';
import { generateWidgetEmbedCode } from '@/app/actions/voice-chat-actions';
import { useAuth } from '@/hooks/use-auth';

interface WidgetEmbedCodeProps {
  cardId: string;
  enabled: boolean;
}

export default function WidgetEmbedCode({ cardId, enabled }: WidgetEmbedCodeProps) {
  const { firebaseUser } = useAuth();
  const [embedCode, setEmbedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (enabled && firebaseUser) {
      loadEmbedCode();
    }
  }, [cardId, enabled, firebaseUser]);

  const loadEmbedCode = async () => {
    if (!firebaseUser) {
      setError('Please log in to view embed code');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const idToken = await firebaseUser.getIdToken();
      const result = await generateWidgetEmbedCode(idToken, cardId);
      
      if (result && result.success && result.embedCode) {
        setEmbedCode(result.embedCode);
      } else {
        setError(result?.message || 'Failed to generate embed code');
      }
    } catch (err) {
      console.error('Error loading embed code:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    setCopyError(null);
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        if (textareaRef.current) {
          textareaRef.current.select();
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          setCopyError('Unable to copy automatically. Please select the text and copy manually (Ctrl+C or Cmd+C)');
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError('Copy failed. Please select the text and copy manually (Ctrl+C or Cmd+C)');
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Card className="mt-6 border-purple-200 bg-purple-50/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Widget Embed Code</CardTitle>
        </div>
        <CardDescription>
          Copy this code to embed your Digital Card with Voice Chat AI on any website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            Generating embed code...
          </div>
        ) : embedCode ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Code Snippet</Label>
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                value={embedCode}
                readOnly
                rows={12}
                className="font-mono text-xs bg-slate-900 text-green-400 border-slate-700"
              />
              {copyError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{copyError}</AlertDescription>
                </Alert>
              )}
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <div className="font-semibold mb-2">Installation Instructions:</div>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Copy the code snippet above using the "Copy Code" button</li>
                  <li>Paste this code just before the closing <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> tag on pages where you want the chatbot</li>
                  <li>The widget automatically uses your brand colors and settings from the General tab</li>
                  <li>It loads as a secure iframe that won't interfere with your website's design</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">
                ✓ Your widget is ready to use
              </p>
              <p className="text-xs text-green-700 mt-1">
                Visitors can chat with your AI assistant in 109 languages. All conversations automatically create leads in your CRM with full chat history.
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
