import React from 'react';
import SalesAgreementScreen from './SalesAgreementScreen';
// Business Rental Management (SSPC-BRMS-01) — owner/landlord side.
export default function BrmAgreements({ category = 'business_rent' }) { return <SalesAgreementScreen kind="rental_mgmt" category={category} />; }
