/**
 * Policy copy, rendered by Pages/Pages/Legal.jsx. The source of truth is resources/content/legal.json
 * (shared with the server for structured data and llms-full.txt). Review with a legal advisor
 * before going live.
 *
 * Page:    { title, kicker, intro, updated, facts: [{ icon, value, label }], sections, related }
 * Section: { id, heading, summary, blocks }
 * Blocks:  { p } | { list } | { steps } | { table: { head, rows } } | { timeline } | { cards } | { callout }
 * Text may contain {email}, {phone}, {hours}, {free} and {fee} (filled at render time).
 */
import legal from '../../content/legal.json';

export const legalPages = legal.pages;
export const legalNav = legal.nav;
