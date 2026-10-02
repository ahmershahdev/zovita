<style>
    :root { --night: #0b1b33; --snow: #f3f0e8; --mint: #9ef0c2; --teal: #0f766e; --coral: #e5532f; color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
        min-height: 100svh; overflow-x: hidden; background: var(--night); color: var(--snow);
        font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background-image: radial-gradient(ellipse at 50% 40%, rgb(158 240 194 / .16), transparent 60%);
    }
    a { color: inherit; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    header, main { position: relative; max-width: 1400px; margin: 0 auto; padding: 24px clamp(16px, 3.2vw, 48px); }
    header { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 28px; font-weight: 600; letter-spacing: -.04em; text-decoration: none; }
    .logo b, .mint { color: var(--mint); }
    .eyebrow { font: 11px/1.4 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
    .code { display: flex; align-items: center; font-size: clamp(7rem, 28vw, 24rem); line-height: .8; letter-spacing: -.06em; font-weight: 600; }
    .capsule { position: relative; display: inline-block; width: .52em; height: .9em; margin: 0 .04em; }
    .capsule i { position: absolute; left: 0; right: 0; height: 50%; transition: transform .9s cubic-bezier(.19, 1, .22, 1); box-shadow: inset 0 -.1em .3em rgb(0 0 0 / .25), inset 0 .1em .2em rgb(255 255 255 / .25); }
    .capsule i:first-child { top: 0; border-radius: 999px 999px .05em .05em; background: linear-gradient(160deg, #b8f6d3, #6ee7c8); }
    .capsule i:last-child { bottom: 0; border-radius: .05em .05em 999px 999px; background: linear-gradient(160deg, #f3f0e8, #cfd8d3); }
    .code:hover .capsule i:first-child { transform: translateY(-10%) rotate(-12deg); }
    .code:hover .capsule i:last-child { transform: translateY(8%) rotate(9deg); }
    h1 { margin: 0; font-weight: inherit; }
    .title { margin: 16px 0 0; font-size: clamp(2.2rem, 5vw, 4.4rem); line-height: .95; letter-spacing: -.04em; font-weight: 600; }
    .body { max-width: 36rem; margin: 18px 0 0; font-size: 18px; opacity: .72; }
    form { display: flex; gap: 8px; max-width: 32rem; margin-top: 32px; padding: 6px 6px 6px 20px; border: 1px solid rgb(243 240 232 / .2); border-radius: 999px; background: rgb(243 240 232 / .05); }
    form:focus-within { border-color: var(--mint); }
    input { flex: 1; min-width: 0; background: transparent; border: 0; color: var(--snow); font: inherit; outline: none; }
    input::placeholder { color: rgb(243 240 232 / .45); }
    button { height: 44px; padding: 0 20px; border: 0; border-radius: 999px; background: var(--mint); color: var(--night); font: 500 14px/1 inherit; cursor: pointer; }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
    nav a { padding: 10px 16px; border: 1px solid rgb(243 240 232 / .18); border-radius: 999px; font-size: 14px; text-decoration: none; transition: border-color .3s, background .3s; }
    nav a:hover, nav a:focus-visible { border-color: var(--mint); background: rgb(243 240 232 / .06); }
    :focus-visible { outline: 2px solid var(--mint); outline-offset: 3px; }
    .field { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
    .pill { position: absolute; width: 42px; height: 17px; border-radius: 999px; opacity: .8; transform: rotate(var(--r)); animation: drift var(--d) ease-in-out infinite alternate; box-shadow: inset 0 -3px 6px rgb(0 0 0 / .18), inset 0 2px 4px rgb(255 255 255 / .35); }
    .p0 { background: linear-gradient(90deg, #9ef0c2 50%, #f3f0e8 50%); }
    .p1 { background: linear-gradient(90deg, #0f766e 50%, #9ef0c2 50%); }
    .p2 { background: linear-gradient(90deg, #e5532f 50%, #f3f0e8 50%); }
    .p3 { background: linear-gradient(90deg, #15294a 50%, #6ee7c8 50%); }
    @keyframes drift { to { transform: rotate(calc(var(--r) + 16deg)) translateY(14px); } }
    @media (prefers-reduced-motion: reduce) { .pill { animation: none; } .capsule i { transition: none; } }
</style>
