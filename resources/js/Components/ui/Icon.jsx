/**
 * Small inline icon set (stroke icons, 24px grid) so we don't ship an icon library.
 */
const paths = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
    arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </>
    ),
    bag: (
        <>
            <path d="M5 8h14l-1 12H6L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </>
    ),
    heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
    user: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </>
    ),
    menu: <path d="M4 8h16M4 16h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 12 5 5 9-10" />,
    upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
    rx: (
        <>
            <path d="M6 20V4h6a4 4 0 0 1 0 8H6" />
            <path d="m11 12 8 8M19 12l-8 8" />
        </>
    ),
    truck: (
        <>
            <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
        </>
    ),
    shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    file: (
        <>
            <path d="M14 3H6v18h12V7l-4-4Z" />
            <path d="M14 3v4h4" />
        </>
    ),
    leaf: <path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l6-6" />,
    package: (
        <>
            <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" />
            <path d="m3 7 9 4 9-4M12 11v10" />
        </>
    ),
    logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
    spark: <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />,
    globe: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </>
    ),
    linkedin: (
        <>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
        </>
    ),
    github: (
        <path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.3c3-.3 6-1.5 6-6.6a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.7 12.7 0 0 0-6.6 0C5.7 1.1 4.6 1.4 4.6 1.4a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 3 8.6c0 5.1 3 6.3 6 6.6a3 3 0 0 0-.9 2.3V21" />
    ),
    code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
    whatsapp: (
        <>
            <path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 19Z" />
            <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z" />
        </>
    ),
};

export default function Icon({ name, size = 20, className, strokeWidth = 1.6, ...props }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
            {...props}
        >
            {paths[name]}
        </svg>
    );
}
