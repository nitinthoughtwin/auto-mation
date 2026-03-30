import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Youtube } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
          <Youtube className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild size="lg" className="gradient-primary text-white">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
