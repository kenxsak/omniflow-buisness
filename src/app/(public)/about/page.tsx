import { ArrowRight, Users, Zap, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">OmniFlow</Link>
        </div>
      </header>

      <main>
        <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">About OmniFlow</h1>
            <p className="text-xl text-muted-foreground mb-8">
              We're building the all-in-one platform that empowers small businesses to compete with enterprises.
            </p>

            <div className="grid md:grid-cols-3 gap-6 my-12">
              <Card>
                <CardHeader>
                  <Users className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Replace expensive tool sprawl with one affordable, AI-powered platform designed for SMEs.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Democratize access to enterprise-grade sales and marketing tools at 1/3 the cost.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Our Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Serving 1,000+ growing businesses worldwide with world-class support.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/30 p-8 rounded-lg mb-8">
              <h2 className="text-2xl font-bold mb-4">Why We Built OmniFlow</h2>
              <p className="text-muted-foreground mb-4">
                WMart Online Services realized small businesses were spending $2,000-$3,500 per month on scattered tools (HubSpot, Mailchimp, Zapier, etc.) while losing 40+ hours monthly juggling platforms. We built OmniFlow to fix that — one unified platform with AI-first features at an affordable price.
              </p>
              <p className="text-muted-foreground">
                <strong>OmniFlow is a service by WMart Online Services</strong> - an AI & digital solutions company serving businesses globally. For more information about our company, visit <a href="https://wmart.in" className="text-primary hover:underline">wmart.in</a>.
              </p>
            </div>

            <div className="text-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Link href="/signup">Start Your Free Trial <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
