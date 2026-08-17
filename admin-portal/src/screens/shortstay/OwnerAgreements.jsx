import React from 'react';
import AgreementsScreen from './AgreementsScreen';

export default function OwnerAgreements() {
  return (
    <AgreementsScreen
      endpoint="/short-stay/owner-agreements"
      title="Owner agreements"
      desc="Management mandates and their signing progress."
      statuses={['draft', 'pending_signature', 'active', 'terminated']}
      emptyHint="No owner agreements yet. Build one from a property's “Owner terms”."
    />
  );
}
