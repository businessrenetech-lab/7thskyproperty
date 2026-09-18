/**
 * htmlToPdf.service.js — render an HTML string to a PDF Buffer with headless
 * Chrome via puppeteer-core. It uses an EXISTING Chrome/Chromium (no bundled
 * download), so `npm install` never pulls Chromium and a deploy can't break on it.
 *
 * If puppeteer-core isn't installed or no Chrome executable is found, htmlToPdf
 * throws and callers fall back to delivering a link instead of an attachment.
 *
 * On a server without Chrome, install Chromium and set PUPPETEER_EXECUTABLE_PATH
 * (or CHROME_PATH) in the environment.
 */
const fs = require('fs');

let puppeteer = null;
try { puppeteer = require('puppeteer-core'); } catch { /* optional dependency */ }

const CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/** The Chrome/Chromium executable this machine can use, or null. */
function findChrome() {
  for (const p of CANDIDATES) {
    try { if (p && fs.existsSync(p)) return p; } catch { /* keep looking */ }
  }
  return null;
}

/** True when a real PDF can be produced here (puppeteer-core + a Chrome binary). */
function pdfAvailable() {
  return !!puppeteer && !!findChrome();
}

/**
 * A print stylesheet prepended to every document before it is rendered, so all
 * agreement families (sales, PM, tenancy, STS, service lines) paginate cleanly.
 * It fixes the breaks that look unprofessional without forcing whole (possibly
 * multi-page) clause cards onto a single page:
 *  - headings never sit orphaned at the foot of a page;
 *  - table rows and list items never split across a page;
 *  - table headers repeat on each page a long schedule spans;
 *  - images and short "keep together" blocks stay intact.
 * Margins stay owned by page.pdf() below (no @page margin, to avoid conflict).
 */
const PRINT_CSS = `<style>
  @media print {
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1, h2, h3, h4 { break-after: avoid-page; page-break-after: avoid; }
    tr, th, td { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    li { break-inside: avoid; page-break-inside: avoid; }
    img, svg, figure { break-inside: avoid; page-break-inside: avoid; }
    [data-sign-field], [id="signatures-section"], .sig-block, .keep-together { break-inside: avoid; page-break-inside: avoid; }
  }
</style>`;

/** Render HTML → PDF Buffer (A4, print backgrounds). Throws if unavailable. */
async function htmlToPdf(html) {
  if (!puppeteer) throw new Error('puppeteer-core is not installed');
  const executablePath = findChrome();
  if (!executablePath) throw new Error('No Chrome/Chromium executable found (set PUPPETEER_EXECUTABLE_PATH)');

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(PRINT_CSS + (html || ''), { waitUntil: 'networkidle0', timeout: 30000 });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
      preferCSSPageSize: false,
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { htmlToPdf, pdfAvailable, findChrome };
