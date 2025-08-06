/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '~/lib/jwtManager'
import { LRUCache } from 'lru-cache'

// 速率限制配置
const RATE_LIMIT_WINDOW = 60 // 时间窗口（秒）
const RATE_LIMIT_MAX_REQUESTS = 500 // 最大请求次数

// 创建 LRU 缓存实例
const rateLimit = new LRUCache<string, number>({
  max: 10000, // 最多缓存 10000 个 IP
  ttl: RATE_LIMIT_WINDOW * 1000, // 自动过期时间（毫秒）
})

// 配置中间件匹配的路由规则
export const config = {
  matcher: [
    '/api/:path*',
    '/user$',
    '/admin/:path*'
  ],
}

function getRateLimit(ip: string) {
  const requests = (rateLimit.get(ip) || 0) + 1
  rateLimit.set(ip, requests)
  
  return {
    isLimited: requests > RATE_LIMIT_MAX_REQUESTS,
    requests,
  }
}

function handleRateLimit(request: NextRequest, origin: string | null) {
  const ip = request.headers.get('cf-connecting-ip') ?? 
             request.headers.get('x-real-ip') ??
             request.headers.get('x-forwarded-for') ?? 
             '127.0.0.1'
  
  const { isLimited, requests } = getRateLimit(ip)

  if (isLimited) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...(origin && { 'Access-Control-Allow-Origin': origin }),
          'Access-Control-Allow-Credentials': 'true',
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_MAX_REQUESTS - requests).toString(),
          'Retry-After': RATE_LIMIT_WINDOW.toString()
        }
      }
    )
  }
  return null
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').split(',').map(url => url.trim())
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // 对 API 路由进行速率限制检查
  if (isApiRoute && request.method !== 'OPTIONS') {
    const result = handleRateLimit(request, origin)
    if (result) {
      return result
    }
  }

  // 检查是否为公开的路由（不需要认证）
  const isPublicApiRoute = request.nextUrl.pathname.startsWith('/api/objectId/')
  const isPublicPageRoute = request.nextUrl.pathname.startsWith('/objectId/')
  
  // 允许公开路由的请求通过
  if (isPublicApiRoute || isPublicPageRoute) {
    return NextResponse.next()
  }

  // 允许 API 路由的 OPTIONS 和 GET 请求通过
  if (isApiRoute && (request.method === 'OPTIONS' || request.method === 'GET')) {
    return NextResponse.next()
  }

  // 从 cookie 中获取 token
  const token = request.cookies.get('auth_token')?.value
  const verifiedToken = await verifyToken(token ?? '')

  // token 验证失败的处理
  if (!token || !verifiedToken) {
    // API 路由返回 401
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...(origin && { 'Access-Control-Allow-Origin': origin }),
            'Access-Control-Allow-Credentials': 'true'
          }
        }
      )
    }
    
    // 非 API 路由重定向到根路由
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ... 其余的 CORS 和 origin 验证逻辑保持不变 ...
  if (!origin) {
    return NextResponse.next()
  }

  if (process.env.NODE_ENV === 'development') {
    const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1')
    if (isLocalhost) {
      return NextResponse.next()
    }
  }

  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    )
  }

  const response = NextResponse.next()
  
  return response
}