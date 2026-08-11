// export function proxiedImage(url?: string | null, version?: string | number | null): string | undefined {
//     if (!url) return undefined;
//     if (url.startsWith("blob:") || url.startsWith("/")) return url;
//     const proxied = `/api/image-proxy?url=${encodeURIComponent(url)}`;
//     return version ? `${proxied}&v=${encodeURIComponent(String(version))}` : proxied;
// }

// Guard against non-string values.
// Prevents runtime crashes if an object or null is accidentally
// passed instead of an image URL.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "");

export function proxiedImage(
    url?: unknown,
    version?: string | number | null
): string | undefined {

    if (typeof url !== "string" || !url) {
        return undefined;
    }

    if (url.startsWith("blob:")) {
        return url;
    }

    // Backend sometimes returns server-relative upload paths (e.g. "/uploads/...")
    // instead of a full URL; resolve those against the API origin before proxying.
    let resolvedUrl = url;
    if (url.startsWith("/uploads/")) {
        resolvedUrl = `${API_ORIGIN}${url}`;
    } else if (url.startsWith("/")) {
        return url;
    }

    const proxied = `/api/image-proxy?url=${encodeURIComponent(resolvedUrl)}`;

    return version
        ? `${proxied}&v=${encodeURIComponent(String(version))}`
        : proxied;
}