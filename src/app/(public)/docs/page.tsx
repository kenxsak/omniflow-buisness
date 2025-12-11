import { ArrowRight, BookOpen, Code } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
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
            <h1 className="text-5xl font-bold mb-6">Documentation</h1>
            <p className="text-xl text-muted-foreground mb-12">
              Everything you need to get started with OmniFlow.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <BookOpen className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>Learn the basics and set up your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Step-by-step guides to get you up and running in minutes.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Code className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>API Reference</CardTitle>
                  <CardDescription>Technical documentation for developers</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Complete API documentation with examples and use cases.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Full Documentation Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                We're building comprehensive documentation to help you get the most out of OmniFlow. For now, check out the resources in your dashboard or contact our support team.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/signup">Get Started <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
