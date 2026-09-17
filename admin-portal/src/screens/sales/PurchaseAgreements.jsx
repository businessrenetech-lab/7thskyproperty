import React from 'react';
import SalesAgreementScreen from './SalesAgreementScreen';
export default function PurchaseAgreements({ category = 'residential' }) { return <SalesAgreementScreen kind="purchase" category={category} />; }
