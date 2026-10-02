import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Pick a delivery location on a map (OpenStreetMap tiles via Leaflet — no API key, no tracking).
 *  - tap the map or drag the pin; "Use my location" asks the browser for GPS
 *  - search a place by name (OpenStreetMap Nominatim, rate-limited politely)
 *  - every new pin is turned back into a readable address for the address field
 * onChange({ lat, lng, address? })
 */
const pin = L.divIcon({
    className: '',
    html: '<span class="map-pin"><span></span></span>',
    iconSize: [34, 44],
    iconAnchor: [17, 42],
});

async function reverse(lat, lng) {
    try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=0&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
        return r.ok ? (await r.json()).display_name ?? null : null;
    } catch {
        return null;
    }
}

export default function MapPicker({ lat, lng, fallback, onChange, className }) {
    const box = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState('');
    const [results, setResults] = useState([]);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const place = async (latlng, { fly = true, lookup = true } = {}) => {
        const { lat: a, lng: b } = latlng;
        if (!marker.current) {
            marker.current = L.marker([a, b], { icon: pin, draggable: true, keyboard: true, title: 'Delivery location' }).addTo(map.current);
            marker.current.on('dragend', () => place(marker.current.getLatLng(), { fly: false }));
        } else {
            marker.current.setLatLng([a, b]);
        }
        if (fly) map.current.flyTo([a, b], Math.max(map.current.getZoom(), 16), { duration: 0.8 });
        const point = { lat: Number(a.toFixed(7)), lng: Number(b.toFixed(7)) };
        onChangeRef.current(point);
        if (lookup) {
            setBusy('address');
            const address = await reverse(point.lat, point.lng);
            setBusy('');
            if (address) onChangeRef.current({ ...point, address });
        }
    };

    useEffect(() => {
        const start = lat && lng ? [lat, lng] : [fallback?.lat ?? 24.8607, fallback?.lng ?? 67.0011];
        map.current = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(start, lat && lng ? 16 : 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        }).addTo(map.current);
        if (lat && lng) place({ lat, lng }, { fly: false, lookup: false });
        map.current.on('click', (e) => place(e.latlng, { fly: false }));
        return () => {
            map.current?.remove();
            map.current = null;
            marker.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const locate = () => {
        if (!navigator.geolocation) return;
        setBusy('locate');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setBusy('');
                place({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => setBusy(''),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const search = async (e) => {
        e.preventDefault();
        if (query.trim().length < 3) return;
        setBusy('search');
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
            setResults(r.ok ? await r.json() : []);
        } catch {
            setResults([]);
        }
        setBusy('');
    };

    return (
        <div className={cn('overflow-hidden rounded-3xl border border-line-strong bg-card', className)}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
                <form onSubmit={search} className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-paper px-3" role="search">
                    <Icon name="search" size={15} className="shrink-0 text-ink-mute" />
                    <label htmlFor="map-search" className="sr-only">
                        Search a place
                    </label>
                    <input id="map-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search an area or landmark" className="h-10 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
                    <button type="submit" className="text-xs text-ink-mute hover:text-ink">
                        {busy === 'search' ? 'Searching…' : 'Find'}
                    </button>
                </form>
                <button type="button" onClick={locate} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs text-paper">
                    <Icon name="globe" size={14} /> {busy === 'locate' ? 'Locating…' : 'Use my location'}
                </button>
            </div>
            {results.length > 0 && (
                <ul className="max-h-48 overflow-y-auto border-b border-line text-sm" data-lenis-prevent>
                    {results.map((r) => (
                        <li key={r.place_id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setResults([]);
                                    place({ lat: Number(r.lat), lng: Number(r.lon) }, { lookup: false });
                                    onChangeRef.current({ lat: Number(Number(r.lat).toFixed(7)), lng: Number(Number(r.lon).toFixed(7)), address: r.display_name });
                                }}
                                className="block w-full px-4 py-2.5 text-left hover:bg-paper-deep"
                            >
                                {r.display_name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div ref={box} className="map-tiles h-72 w-full md:h-80" role="application" aria-label="Map: tap to place your delivery pin, or drag the pin" />
            <p className="px-4 py-2.5 text-xs text-ink-mute">{busy === 'address' ? 'Finding the address…' : 'Tap the map or drag the pin to your door. The rider sees this pin.'}</p>
        </div>
    );
}
