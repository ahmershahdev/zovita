import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Local WebP product shot with a 320/640 srcset, intrinsic size (no layout shift), lazy decoding and
 * a fade-in once loaded. Falls back to a neutral pill glyph if the file is missing.
 */
export default function ProductImage({ product, sizes = '50vw', priority = false, className, alt, dim = false }) {
    const [state, setState] = useState('loading');
    const hasVariants = product.thumb && product.thumb !== product.image;

    if (state === 'error' || !product.image) {
        return (
            <span className={cn('grid place-items-center text-ink-mute/40', className)} role="img" aria-label={alt ?? product.name}>
                <svg viewBox="0 0 48 48" className="size-1/3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="8" y="17" width="32" height="14" rx="7" transform="rotate(-35 24 24)" />
                    <path d="m19 15 10 18" />
                </svg>
            </span>
        );
    }

    return (
        <img
            src={hasVariants ? product.thumb : product.image}
            srcSet={hasVariants ? `${product.thumb} 320w, ${product.image} 640w` : undefined}
            sizes={hasVariants ? sizes : undefined}
            width="640"
            height="640"
            alt={alt ?? product.name}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onLoad={() => setState('loaded')}
            onError={() => setState('error')}
            className={cn('transition-opacity duration-700', state !== 'loaded' ? 'opacity-0' : dim ? 'opacity-40 grayscale' : 'opacity-100', className)}
            ref={(el) => {
                // Cached images can finish before React attaches onLoad.
                if (el?.complete && el.naturalWidth && state === 'loading') setState('loaded');
            }}
        />
    );
}
