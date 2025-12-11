"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PricingSection } from '@/components/pricing/pricing-section';
import { CurrencySwitcher } from '@/components/pricing/currency-switcher';
import { SupportedCurrency } from '@/lib/geo-detection';

export default function PricingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency | undefined>(undefined);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Bot className="h-7 w-7" />
            OmniFlow
          </Link>
          <nav className="hidden md:flex gap-4 items-center">
            <Link href="/#features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
            <Link href="/#benefits" className="text-sm font-medium hover:text-primary transition-colors">Benefits</Link>
            <Link href="/#comparison" className="text-sm font-medium hover:text-primary transition-colors">Compare</Link>
            <Link href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
            <CurrencySwitcher value={currency} onChange={setCurrency} />
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">Sign In</Link>
            <Button asChild variant="accent"><Link href="/signup">Get Started Free</Link></Button>
          </nav>
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
        {/* Mobile Menu */}
        <div className={cn("md:hidden", isMenuOpen ? "block" : "hidden")}>
          <div className="container mx-auto px-4 pt-2 pb-4 space-y-3 border-t">
            <CurrencySwitcher value={currency} onChange={setCurrency} className="w-full" />
            <Link href="/#features" className="block text-base font-medium hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Features</Link>
            <Link href="/#benefits" className="block text-base font-medium hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Benefits</Link>
            <Link href="/#comparison" className="block text-base font-medium hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Compare</Link>
            <Link href="/pricing" className="block text-base font-medium hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Pricing</Link>
            <Link href="/login" className="block text-base font-medium hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
            <Button asChild variant="accent" className="w-full"><Link href="/signup">Get Started Free</Link></Button>
          </div>
        </div>
      </header>

      <main>
        {/* Pricing Section - Clean and minimal */}
        <PricingSection 
          showHeader={true}
          headerTitle="Simple, Transparent Pricing"
          headerDescription="Start free, scale as you grow. All paid plans include unlimited AI with your own API key."
          className="bg-background"
          currency={currency}
          onCurrencyChange={setCurrency}
        />

        {/* Simple FAQ or CTA Section */}
        <section className="py-16 px-4 text-center bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Start your 14-day free trial with full access to all features. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="accent">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/#features">View All Features</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-background border-t">
        <div className="container mx-auto py-8 px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
              <Bot className="h-6 w-6" />
              <span>OmniFlow</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} OmniFlow. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/#features" className="text-muted-foreground hover:text-primary">Features</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-primary">Pricing</Link>
              <Link href="/login" className="text-muted-foreground hover:text-primary">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
