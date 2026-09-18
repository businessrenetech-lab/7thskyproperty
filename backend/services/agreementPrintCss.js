/**
 * agreementPrintCss.js — one print stylesheet + page wrapper for every agreement
 * document, so a signed copy paginates the same whether it is:
 *   • printed from the browser (the "download signed" path serves HTML), or
 *   • rendered to PDF server-side by htmlToPdf (Puppeteer).
 *
 * The documents are authored as HTML fragments (no <head>), so when a browser
 * printed one it used its DEFAULT margins and no page-break rules — giving
 * inconsistent margins, extra pages and clauses/tables split across page edges.
 * Wrapping the fragment in a real page with this stylesheet makes every copy
 * consistent: fixed A4 margins, headings that don't orphan, and rows / list
 * items / signature blocks that never split across a page.
 */

// The <style> block. Kept as a string so it can be prepended (Puppeteer path,
// where the html may already be a fragment) or embedded in a full page wrapper.
const PRINT_STYLE = `<style>
  @page { size: A4; margin: 16mm 14mm; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print {
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
    tr, th, td { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    li { break-inside: avoid; page-break-inside: avoid; }
    img, svg, figure { break-inside: avoid; page-break-inside: avoid; }
    [data-sign-field], .sig-block, .keep-together {
      break-inside: avoid; page-break-inside: avoid;
    }
    /* Cover / Table-of-Contents were fixed-height cards that floated their footer
       mid-page and left a big blank; let them size to their content. Their own
       inline page-break-after keeps them on their own page. */
    .agreement-page, .agreement-cover-page, .agreement-toc-page {
      min-height: 0 !important; max-height: none !important;
    }
    /* Each schedule starts on its own page, and the signatures block is the final
       page on its own. Every family tags these anchors the same way, so this
       applies to sale/purchase, PM, tenancy, STS and the service-line agreements
       alike — and to already-signed documents, not just new ones. Each schedule /
       the signatures also tries to stay whole on its page. */
    #sched-a, #sched-b, #sched-c, #sched-d, #signatures-section {
      break-before: page; page-break-before: always;
      break-inside: avoid; page-break-inside: avoid;
    }
  }
</style>`;

/** Wrap an agreement HTML fragment in a complete, print-ready A4 page. */
function wrapPrintable(bodyHtml, title = 'Agreement') {
  const esc = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
${PRINT_STYLE}
</head>
<body>
${bodyHtml || ''}
</body>
</html>`;
}

module.exports = { PRINT_STYLE, wrapPrintable };
