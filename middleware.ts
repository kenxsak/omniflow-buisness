import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/signup', '/pricing', '/capture-lead', '/card', '/offline'];
const authPaths = ['/login', '/signup'];

const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (origin.includes('.replit.dev') || origin.includes('.replit.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return addSecurityHeaders(response);
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    const response = NextResponse.next();
    if (isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return addSecurityHeaders(response);
  }

  const isPublicPath = pathname === '/' || publicPaths.some(path => path !== '/' && pathname.startsWith(path));
  const isAuthPath = authPaths.some(path => pathname === path);

  const authToken = request.cookies.get('firebase-auth-token')?.value;
  const isAuthenticated = !!authToken;

  if (isAuthenticated && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
