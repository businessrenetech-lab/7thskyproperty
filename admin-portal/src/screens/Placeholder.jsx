import React from 'react';
import { Hammer } from 'lucide-react';
import { PageHead, EmptyState } from '../ui/kit';

export default function Placeholder({ title, note }) {
  return (
    <>
      <PageHead title={title} desc={note || 'This module is being built next.'} />
      <div className="card"><EmptyState icon={Hammer} title={`${title} — coming next`} sub="The database and APIs for this module are ready. The screen is being built in the current phase." /></div>
    </>
  );
}
