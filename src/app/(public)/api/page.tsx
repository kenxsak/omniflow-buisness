import { ArrowRight, Code2, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ApiPage() {
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
            <h1 className="text-5xl font-bold mb-6">API Documentation</h1>
            <p className="text-xl text-muted-foreground mb-12">
              Powerful REST APIs to integrate OmniFlow with your applications.
            </p>

            <div className="grid gap-6 mb-12">
              <Card className="border-2 border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Code2 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">REST API</h3>
                      <p className="text-muted-foreground mb-4">
                        Manage contacts, campaigns, and automations programmatically.
                      </p>
                      <div className="bg-slate-900 text-slate-100 p-4 rounded text-sm font-mono overflow-x-auto">
                        <code>curl -X GET https://api.omniflow.io/v1/contacts \<br/>
                        &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Zap className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Webhooks</h3>
                      <p className="text-muted-foreground">
                        Real-time event notifications for campaigns, leads, and automations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">API Documentation Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                Full API reference docs with code examples, authentication guides, and use cases are under development. Contact our team for early access.
              </p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/contact">Contact Us <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
