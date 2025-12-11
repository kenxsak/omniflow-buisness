import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CareersPage() {
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
            <h1 className="text-5xl font-bold mb-6">Join Our Team</h1>
            <p className="text-xl text-muted-foreground mb-12">
              Help us revolutionize how small businesses manage their sales and marketing.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-8 rounded-lg mb-12">
              <h2 className="text-2xl font-bold mb-4">Join WMart Online Services</h2>
              <p className="text-muted-foreground mb-6">
                WMart Online Services (makers of OmniFlow) is looking for talented people to join our fast-growing team. We value innovation, collaboration, and a passion for helping small businesses succeed.
              </p>
              <p className="text-muted-foreground">
                Send your resume to support@worldmart.in with subject "Career Inquiry" or visit <a href="https://wmart.in" className="text-primary hover:underline">wmart.in</a> for opportunities.
              </p>
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Why Work at OmniFlow?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Mission-Driven</h3>
                  <p className="text-muted-foreground">
                    Help small businesses compete with enterprises through affordable, powerful tools.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Remote-First Culture</h3>
                  <p className="text-muted-foreground">
                    Work from anywhere. We believe in flexibility and trust.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Growth Opportunity</h3>
                  <p className="text-muted-foreground">
                    Join a fast-growing startup with significant upside potential.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
