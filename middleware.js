import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/api/admin/')) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    const userAgent = request.headers.get('user-agent') || '';
    
    const isSameOrigin = 
      (origin && origin.includes(host)) || 
      (referer && referer.includes(host));

    if (
      !isSameOrigin || 
      userAgent.includes('python') || 
      userAgent.includes('curl') || 
      userAgent.includes('postman')
    ) {
      return new NextResponse(
        JSON.stringify({ 
          error: '🚫 Erişim Reddedildi', 
          message: 'Bu alan sadece site yöneticisine açıktır. Dışarıdan erişim yasaktır.' 
        }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};
