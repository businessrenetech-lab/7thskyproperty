// admin-portal/src/screens/sales/settlement-desk/useSettlementDesk.js
//
// The Settlement Desk's single data source. Composes the existing /sales reads
// (no new endpoints) and refetches after every mutation. Field names match
// backend getPropertyFile's res.json: a bare object (no `data` wrapper) with
// `settlement` carrying its own lines/payments/disbursements/approvals/trust,
// `transaction.parties`, and top-level `blockers` + `next_action`.
import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { unwrap, arr } from './settlementMoney';

export function useSettlementDesk(propertyId) {
  const toast = useToast();
  const [picture, setPicture] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const file = unwrap(await api.get(`/sales/properties/${propertyId}`));
      const settlement = file.settlement || null;
      const sid = settlement?.id;
      const tx = file.transaction || file.active_transaction || null;
      const [stmt, quote, bank, partyBanks] = await Promise.allSettled([
        sid ? api.get(`/sales/settlements/${sid}/statement`) : Promise.reject(new Error('no settlement')),
        sid ? api.get(`/sales/settlements/${sid}/agency-fees`) : Promise.reject(new Error('no settlement')),
        sid ? api.get(`/sales/settlements/${sid}/bank-lines`) : Promise.reject(new Error('no settlement')),
        tx?.id ? api.get(`/sales/transactions/${tx.id}/bank-accounts`) : Promise.reject(new Error('no transaction')),
      ]);
      setPicture({
        property: file.property || null,
        profile: file.profile || null,
        transaction: tx,
        settlement,
        lines: arr(settlement?.lines),
        payments: arr(settlement?.payments),
        disbursements: arr(settlement?.disbursements),
        approvals: arr(settlement?.approvals),
        parties: arr(tx?.parties),
        trust: settlement?.trust || { accounts: [], entries: [], total_balance: 0 },
        blockers: arr(file.blockers),
        nextAction: file.next_action || null,
        statement: stmt.status === 'fulfilled' ? unwrap(stmt.value) : null,
        agencyQuote: quote.status === 'fulfilled' ? unwrap(quote.value) : null,
        bankLines: bank.status === 'fulfilled' ? arr(unwrap(bank.value)) : [],
        partyBankAccounts: partyBanks.status === 'fulfilled' ? arr(unwrap(partyBanks.value)) : [],
      });
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load the settlement.');
    } finally {
      setBusy(false);
    }
  }, [propertyId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Run a mutation, toast success/error, refetch, and return the response (or
  // false on failure). Every view routes its writes through here.
  const call = useCallback(async (fn, successMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (successMsg) toast.success(successMsg);
      await refetch();
      return res;
    } catch (e) {
      toast.error(e.response?.data?.error || 'Action failed');
      return false;
    } finally {
      setBusy(false);
    }
  }, [refetch, toast]);

  return { picture, refetch, busy, error, call };
}
