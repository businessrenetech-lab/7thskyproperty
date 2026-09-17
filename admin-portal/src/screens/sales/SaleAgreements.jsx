import React from 'react';
import SalesAgreementScreen from './SalesAgreementScreen';
export default function SaleAgreements({ category = 'residential' }) { return <SalesAgreementScreen kind="sale" category={category} />; }
