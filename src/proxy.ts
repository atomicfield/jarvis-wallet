import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log("PROXY:", pathname);

  if (request.method === "POST") {
    return NextResponse.next();
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("firebaseAuthToken")?.value;

  const isAuthPage = pathname === "/"; 

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (token) {
    try {
      const decodedToken = decodeJwt(token);
      
      if (decodedToken.exp && (decodedToken.exp - 300) * 1000 < Date.now()) {
        return NextResponse.redirect(
          new URL(`/api/refresh-token?redirect=${encodeURIComponent(pathname)}`, request.url)
        );
      }
    } catch {
      console.error("This token is invalid or expired:");
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Her şey yolundaysa normal akışa devam et
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/home", 
    "/account/:path*",
    "/property-search",
  ],
};