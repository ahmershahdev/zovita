let loader;

/**
 * Loads Google's api.js exactly once. Rendering with the v3 site key still allows v2 checkbox
 * widgets via grecaptcha.render(), so both versions share a single script and global.
 */
export function loadRecaptcha(v3SiteKey) {
    if (!loader) {
        loader = new Promise((resolve, reject) => {
            window.__zvRecaptchaReady = () => resolve(window.grecaptcha);
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?onload=__zvRecaptchaReady&render=${encodeURIComponent(v3SiteKey || 'explicit')}`;
            script.async = true;
            script.defer = true;
            script.onerror = () => {
                loader = undefined;
                reject(new Error('reCAPTCHA failed to load'));
            };
            document.head.appendChild(script);
        });
    }
    return loader;
}
