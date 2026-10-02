import { useEffect, useState } from 'react';

/**
 * false during server rendering and the hydration pass, true right after. Browser-only UI (portals
 * into document.body, things that read window) renders behind it, so the server HTML and the
 * first client render match exactly.
 */
export default function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}
