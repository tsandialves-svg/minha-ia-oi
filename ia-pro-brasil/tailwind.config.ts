import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { ink:'#14201d', moss:'#315a49', lime:'#d6f36b', mist:'#f3f4ee', coral:'#e7795d' }, fontFamily: { display:['Georgia','serif'], sans:['Trebuchet MS','sans-serif'] } } }, plugins: [] } satisfies Config;
