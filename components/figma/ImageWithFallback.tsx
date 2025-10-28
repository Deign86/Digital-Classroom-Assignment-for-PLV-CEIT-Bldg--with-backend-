import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, loading, decoding, ...rest } = props

  // Default to lazy-loading and async decoding to improve performance for offscreen images.
  const effectiveLoading = loading ?? 'lazy'
  const effectiveDecoding = decoding ?? 'async'

  // The image manifest (if present) lists available optimized variants.
  // We load it lazily from the public folder at runtime (it's a small JSON file).
  // Manifest format: { "/images/foo.jpg": { "avif": "/images/foo.avif", "webp": "/images/foo.webp" }, ... }
  const [manifest, setManifest] = React.useState<Record<string, { avif?: string | null; webp?: string | null; }> | null>(null);

  React.useEffect(() => {
    let canceled = false;
    fetch('/image-manifest.json').then((r) => {
      if (!r.ok) return null;
      return r.json();
    }).then((j) => {
      if (!canceled) setManifest(j || null);
    }).catch(() => {
      if (!canceled) setManifest(null);
    });
    return () => { canceled = true; };
  }, []);

  const candidates = (() => {
    try {
      if (!src || typeof src !== 'string') return null;
      if (!manifest) return null;
      const entry = manifest[src as string] || manifest[new URL(src, location.origin).pathname];
      if (!entry) return null;
      return { avif: entry.avif ?? null, webp: entry.webp ?? null, fallback: src };
    } catch (e) {
      return null;
    }
  })();

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt={alt ?? 'Error loading image'} loading={effectiveLoading} decoding={effectiveDecoding} data-original-url={src} {...rest} />
        </div>
      </div>
    )
  }

  // If we can, prefer a <picture> with AVIF/WebP fallbacks for better compression.
    if (candidates) {
    return (
      <picture>
        {candidates.avif ? <source srcSet={candidates.avif} type="image/avif" /> : null}
        {candidates.webp ? <source srcSet={candidates.webp} type="image/webp" /> : null}
        <img src={candidates.fallback} alt={alt} className={className} style={style} loading={effectiveLoading} decoding={effectiveDecoding} {...rest} onError={handleError} />
      </picture>
    )
  }

  return (
    <img src={src} alt={alt} className={className} style={style} loading={effectiveLoading} decoding={effectiveDecoding} {...rest} onError={handleError} />
  )
}
