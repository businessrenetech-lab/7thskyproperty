import React from 'react';
import AgreementsScreen from './AgreementsScreen';

export default function GuestAgreements() {
  return (
    <AgreementsScreen
      endpoint="/short-stay/guest-agreements"
      title="Guest agreements"
      desc="Stay agreements, signers and signing order."
      statuses={['sent', 'viewed', 'signed', 'active', 'declined']}
      emptyHint="No guest agreements yet. Send one from a booking's “Send terms”."
    />
  );
}
