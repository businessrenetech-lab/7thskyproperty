import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Wraps every Property Management route in `.pm-scope` so the premium design
 * system (pm-design.css) applies to the whole section — its own tokens plus the
 * elevated base-kit styling — without touching the landlord/tenant/other admin UI.
 */
export default function PmScopeLayout() {
  return (
    <div className="pm-scope">
      <Outlet />
    </div>
  );
}
