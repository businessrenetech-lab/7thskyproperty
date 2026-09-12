// admin-portal/src/screens/sales/BuyerInvoices.jsx
//
// Buyer-side accounting: the fee invoices generated + drafted when a buyer's
// purchase agreement (RPPS) is signed. Same list/edit/send/PDF/collect features
// as the seller Invoices tab, filtered to purchase agreement fees. Buyer service
// is fee-for-coordination — this is where those fees are managed and collected.
import React from 'react';
import { PageHead } from '../../ui/kit';
import SalesInvoices from './SalesInvoices';

export default function BuyerInvoices() {
  return (
    <>
      <PageHead title="Buyer Invoices" desc="Service-fee invoices drafted when a buyer's purchase agreement (RPPS) is signed — edit lines, email a PDF, and record collection." />
      <SalesInvoices kind="purchase" />
    </>
  );
}
