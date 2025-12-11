import { ArrowRight, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ContactPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">OmniFlow</Link>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">Get in Touch</h1>
            <p className="text-xl text-muted-foreground mb-12">
              Have questions? We'd love to hear from you. Reach out to our team.
            </p>

            <div className="grid gap-6 mb-12">
              <Card>
                <CardContent className="pt-6 flex items-start gap-4">
                  <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Email</h3>
                    <a href="mailto:support@worldmart.in" className="text-primary hover:underline">
                      support@worldmart.in
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-start gap-4">
                  <MessageSquare className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">AI Voice Chat Widget</h3>
                    <p className="text-muted-foreground">
                      Use the AI voice chat widget on our website for instant support. Powered by WMart AI technology, available 24/7 in 109+ languages.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-8 rounded-lg">
              <h2 className="text-xl font-bold mb-4">How to Reach Us</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Company:</strong> WMart Online Services<br/>
                <strong>Email:</strong> support@worldmart.in<br/>
                <strong>Phone:</strong> +91-8080077736<br/>
                <strong>Business Hours:</strong> Mon-Fri 9:00 AM - 6:00 PM IST | Sat 10:00 AM - 4:00 PM IST<br/>
                <strong>Emergency Support:</strong> 24/7 via email for urgent technical issues
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/signup">Start Free Trial <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
