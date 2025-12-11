import { ArrowRight, HelpCircle, MessageCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupportPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">OmniFlow</Link>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">Support & Help</h1>
            <p className="text-xl text-muted-foreground mb-12">
              We're here to help. Get answers and support from our team.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <MessageCircle className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-lg">24/7 Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Get instant answers from our support team in your dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Clock className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Fast Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Most queries answered within 2 hours during business hours.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <HelpCircle className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Browse our FAQ and help articles for quick answers.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">How to Get Support</h2>
              <ul className="space-y-3 text-muted-foreground mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Use the AI Voice Chat Widget on our website (fastest way - 24/7, 109+ languages)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Email us at support@worldmart.in</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Call +91-8080077736 (Mon-Fri 9:00 AM - 6:00 PM IST)</span>
                </li>
              </ul>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/signup">Get Started <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
