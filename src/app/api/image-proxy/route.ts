import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAMES = ["api.emotales.com", "cdn.emotales.com"];

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return new NextResponse("Missing url", { status: 400 });
    }

    let target: URL;
    try {
        target = new URL(url);
    } catch {
        return new NextResponse("Invalid url", { status: 400 });
    }

    if (!ALLOWED_HOSTNAMES.includes(target.hostname)) {
        return new NextResponse("Forbidden host", { status: 403 });
    }

    const conditionalHeaders: HeadersInit = {};
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");
    if (ifNoneMatch) conditionalHeaders["if-none-match"] = ifNoneMatch;
    if (ifModifiedSince) conditionalHeaders["if-modified-since"] = ifModifiedSince;

    const upstream = await fetch(target.toString(), { headers: conditionalHeaders });

    if (upstream.status === 304) {
        return new NextResponse(null, { status: 304 });
    }
    if (!upstream.ok) {
        return new NextResponse("Upstream error", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const etag = upstream.headers.get("etag");
    const lastModified = upstream.headers.get("last-modified");
    const body = await upstream.arrayBuffer();

    const headers: Record<string, string> = {
        "Content-Type": contentType,
        // Always revalidate with upstream (via ETag/Last-Modified) instead of
        // blindly caching, since re-uploaded images keep the same filename/URL.
        "Cache-Control": "public, max-age=0, must-revalidate",
    };
    if (etag) headers["ETag"] = etag;
    if (lastModified) headers["Last-Modified"] = lastModified;

    return new NextResponse(body, { headers });
}
