import React from 'react';
import SalesAgreementScreen from './SalesAgreementScreen';
// Business Registration (SSPC-BR-CSA-01) — client-side customer service agreement.
export default function BrgAgreements({ category = 'business_registration' }) { return <SalesAgreementScreen kind="registration" category={category} />; }
