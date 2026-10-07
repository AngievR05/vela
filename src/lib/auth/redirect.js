const protectedPaths = ["/home", "/stats", "/library", "/discover", "/dna", "/settings", "/setup"];

export function isProtectedPath(pathname) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Restrict return destinations to app pages, including after email callbacks.
export function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/home";
  try {
    const url = new URL(value, "https://vela.invalid");
    return url.origin === "https://vela.invalid" && isProtectedPath(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}` : "/home";
  } catch {
    return "/home";
  }
}
