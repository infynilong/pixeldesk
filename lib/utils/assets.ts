/**
 * Assets Utility
 * Handlers for asset URLs to support local and OSS storage.
 */

/**
 * Checks if a URL is an external URL.
 */
export function isExternalUrl(url: string | null | undefined): boolean {
    if (!url) return false
    return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * Transforms a relative path to a full asset URL.
 * If NEXT_PUBLIC_ASSET_PREFIX is set, it prepends it to the path.
 * 
 * @param path The relative path to the asset (e.g., /uploads/assets/...)
 * @returns The full URL to the asset
 */
export function getAssetUrl(path: string | null | undefined): string {
    if (!path) return ''

    // If it's already a full URL or data URI, return as is
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path
    }

    const prefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || ''

    // Ensure path starts with / if prefix exists and doesn't end with /
    let normalizedPath = path
    if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
    }

    // If prefix ends with / and path starts with /, remove one /
    if (prefix.endsWith('/') && normalizedPath.startsWith('/')) {
        return prefix + normalizedPath.substring(1)
    }

    return prefix + normalizedPath
}
