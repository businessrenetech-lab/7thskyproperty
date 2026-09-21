import React from 'react';
import SalesAgreementScreen from './SalesAgreementScreen';
// Business Tenancy Management (SSPC-BTMS-01) — tenant/lessee side.
export default function BtmAgreements({ category = 'business_rent' }) { return <SalesAgreementScreen kind="tenancy_mgmt" category={category} />; }
