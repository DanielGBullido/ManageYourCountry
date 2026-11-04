/** Public address of the site: the Vercel production domain, or the current default. */
export const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://manage-your-country.vercel.app';
