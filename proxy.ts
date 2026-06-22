import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");
  if (isAdmin && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
