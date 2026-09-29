/**
 * Policy copy. Each section: { heading, body: string | string[] (list) }.
 * Review with a legal advisor before going live.
 */
export const legalPages = {
    shipping: {
        title: 'Shipping information',
        intro: 'Dispatch timing, delivery windows and how we handle your parcel.',
        updated: '2026-09-30',
        sections: [
            { heading: 'Delivery areas & timing', body: 'We deliver across Pakistan. Major cities usually receive orders in 1–3 business days; other regions in 2–5 business days. Orders confirmed before 2 PM are generally dispatched the same day.' },
            { heading: 'Delivery fees', body: 'Delivery is free on orders over PKR 2,500. A flat PKR 150 fee applies to smaller orders.' },
            { heading: 'Prescription orders', body: 'Orders containing prescription medicine are dispatched after a pharmacist has reviewed the prescription and confirmed the order with you by phone.' },
            { heading: 'Packaging & handling', body: 'Products are sealed, batch-checked and packed with handling appropriate to each item. Temperature-sensitive products are packed to preserve their condition in transit.' },
            { heading: 'Delays', body: ['Public holidays and weekends', 'Weather or route disruptions', 'Peak demand periods', 'Incorrect or incomplete addresses'] },
        ],
    },
    returns: {
        title: 'Returns & refunds',
        intro: 'Fair, transparent return handling — with the safety rules medicines require.',
        updated: '2026-09-30',
        sections: [
            { heading: 'Return window', body: 'Request a return within 7 days of delivery by contacting our care team with your order number.' },
            { heading: 'Eligible items', body: 'Unopened, non-refrigerated products in their original, undamaged packaging with the invoice.' },
            { heading: 'Non-returnable items', body: ['Opened or partially used medicines', 'Refrigerated / cold-chain products', 'Personal-care and hygiene products once opened', 'Baby formula once opened'] },
            { heading: 'Damaged or incorrect items', body: 'Tell us within 48 hours of delivery with a photo. We will replace the item or refund you in full, including delivery fees.' },
            { heading: 'Refund timeline', body: 'Approved refunds are processed within 5–7 business days by bank transfer or mobile wallet.' },
        ],
    },
    privacy: {
        title: 'Privacy policy',
        intro: 'What we collect, why, and how we keep it safe.',
        updated: '2026-09-30',
        sections: [
            { heading: 'What we collect', body: ['Contact details: name, email, phone', 'Delivery address', 'Order history', 'Prescriptions you upload', 'Technical data such as IP address for security and fraud prevention'] },
            { heading: 'How we use it', body: 'To process and deliver orders, have a pharmacist review prescriptions, send transactional emails (order confirmations, password resets) and, if you opt in, a monthly newsletter.' },
            { heading: 'Prescriptions', body: 'Prescription files are stored on private storage that is not accessible from the web and are only used by our pharmacists to fulfil your order.' },
            { heading: 'Service providers', body: 'We use Resend to deliver email and Google reCAPTCHA to protect forms from abuse. These providers process only the data needed for those services.' },
            { heading: 'Your rights', body: 'You can request a copy of your data, ask us to correct it, or ask us to delete your account at any time by contacting help@zovita.pk.' },
        ],
    },
    terms: {
        title: 'Terms of service',
        intro: 'The agreement between you and Zovita when you use this site.',
        updated: '2026-09-30',
        sections: [
            { heading: 'Using Zovita', body: 'You must provide accurate information when ordering. Prescription-only medicines are supplied only against a valid prescription issued to the patient.' },
            { heading: 'Medical information', body: 'Product information is provided for reference and is not medical advice. Always follow your doctor’s or pharmacist’s instructions.' },
            { heading: 'Prices & availability', body: 'Prices are in PKR and include applicable taxes. We may cancel an order if an item becomes unavailable or was listed with an obvious pricing error; you will not be charged for cancelled items.' },
            { heading: 'Payment', body: 'Orders are paid in cash on delivery. Please check your parcel before paying.' },
            { heading: 'Liability', body: 'To the extent permitted by law, Zovita is not liable for indirect losses arising from use of the site. Nothing in these terms limits rights you have under Pakistani consumer law.' },
        ],
    },
};
