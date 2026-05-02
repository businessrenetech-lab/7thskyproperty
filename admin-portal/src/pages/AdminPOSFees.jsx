import React, { useState, useEffect } from 'react';
import { Loader2, Receipt, Download } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import { generateReceiptHtml, downloadReceiptPdf } from '../utils/pdfUtils';
import '../styles/GlobalStyles.css';

const POSFees = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [stats, setStats] = useState({ totalCollected: 0, pending: 0, overdue: 0 });
  const [methodFilter, setMethodFilter] = useState('all');
  const [liquidAccounts, setLiquidAccounts] = useState([]);

  const [activeTab, setActiveTab] = useState('pending');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [receiptHtmlContent, setReceiptHtmlContent] = useState('');
  
  const [paymentData, setPaymentData] = useState({ amount: '', account_id: '', method: 'cash', transaction_ref: '', notes: '', referral_amount: 0 });
  const [rejectNote, setRejectNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mapAccountToMethod = (acc) => {
    if (!acc) return 'cash';
    const n = (acc.name || '').toLowerCase();
    if (n.includes('bkash')) return 'bkash';
    if (n.includes('nagad')) return 'nagad';
    if (acc.sub_type === 'bank') return 'bank_transfer';
    if (acc.sub_type === 'mfs') return n.includes('nagad') ? 'nagad' : n.includes('bkash') ? 'bkash' : 'cash';
    return acc.sub_type === 'card' ? 'card' : 'cash';
  };

  const getInvoiceStudentName = (invoice) => {
    if (invoice?.invoice_type === 'custom') {
      return invoice?.customer_name ? `${invoice.customer_name} (Customer)` : 'Custom Invoice';
    }
    return invoice?.Student?.User?.name || invoice?.Enrollment?.Student?.User?.name || 'Unknown';
  };

  const getInvoiceReferralInfo = (invoice) => ({
    referredBy: invoice?.Student?.referred_by || invoice?.Enrollment?.Student?.referred_by || '',
    amount: Number(invoice?.Student?.referral_amount || invoice?.Enrollment?.Student?.referral_amount || 0),
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [txRes, pendingRes, statsRes, accRes] = await Promise.all([
        api.get('/pos/transactions').catch(() => ({ data: [] })),
        api.get('/pos/pending').catch(() => ({ data: [] })),
        api.get('/finance/overview').catch(() => ({ data: {} })),
        api.get('/finance/accounts/liquid').catch(() => ({ data: [] }))
      ]);
      setTransactions(txRes.data || []);
      setPendingInvoices(pendingRes.data || []);
      setStats({
        totalCollected: statsRes.data.feeCollected || 0,
        pending: statsRes.data.receivablesDue || 0,
        overdue: statsRes.data.overdueReceivables || 0
      });
      setLiquidAccounts(accRes.data || []);
      if (accRes.data?.length > 0) {
        setPaymentData(prev => ({ ...prev, account_id: accRes.data[0].id, method: mapAccountToMethod(accRes.data[0]) }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openReceipt = async (tx) => {
    setSelectedTx(tx);
    const html = await generateReceiptHtml(tx);
    setReceiptHtmlContent(html);
    setShowReceiptModal(true);
  };

  const methodColors = { bkash: '#e2136e', nagad: '#f6921e', card: '#3b82f6', cash: '#10b981', bank_transfer: '#8b5cf6' };
  const selectedReferral = getInvoiceReferralInfo(selectedInvoice);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="view-head">
        <div>
          <div className="view-title">POS & Fee Management</div>
          <div className="view-sub">Dynamic invoicing · Ledger integration · Receipt generation</div>
        </div>
        <div className="view-actions">
          <button className={`btn-${activeTab === 'pending' ? 'stitch' : 'ghost'}`} onClick={() => setActiveTab('pending')} style={{ fontSize: '12px' }}>Pending Fees</button>
          <button className={`btn-${activeTab === 'recent' ? 'stitch' : 'ghost'}`} onClick={() => setActiveTab('recent')} style={{ fontSize: '12px' }}>Transactions</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="pulse-grid pg-3">
        <div className="pulse-card c-mint">
          <div className="pc-label">Total Collected</div>
          <div className="pc-value">৳{stats.totalCollected.toLocaleString()}</div>
        </div>
        <div className="pulse-card c-amber">
          <div className="pc-label">Pending</div>
          <div className="pc-value">৳{stats.pending.toLocaleString()}</div>
        </div>
        <div className="pulse-card c-rose">
          <div className="pc-label">Overdue</div>
          <div className="pc-value">৳{stats.overdue.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Area */}
      <div className="g65">
        <div className="sc">
          {activeTab === 'recent' && (
            <>
              <div className="sc-head">
                <span className="sc-title">Recent Transactions</span>
                <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="glass-input" style={{ width: 'auto', padding: '5px 10px', fontSize: '12px' }}>
                  <option value="all">All Methods</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="st-wrap">
                <table className="stitch">
                  <thead>
                    <tr><th>Receipt</th><th>Student / Customer</th><th>Description</th><th>Amount</th><th>Method</th><th>Date</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}><Loader2 size={24} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto' }} /></td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No recent transactions.</td></tr>
                    ) : transactions.filter(r => methodFilter === 'all' || r.method === methodFilter).map((row) => (
                      <tr key={row.id}>
                        <td className="td-mono">TRX-{row.id}</td>
                        <td className="td-name">{row.source === 'manual' ? (row.Invoice?.Customer?.name || row.Invoice?.customer_name || 'Customer') : (row.Enrollment?.Student?.User?.name || 'Unknown')}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{row.source === 'manual' ? (row.Invoice?.IncomeCategory?.name || 'Custom Income') : (row.Enrollment?.Batch?.Course?.title || 'Tuition Fee')}</td>
                        <td style={{ fontWeight: 700 }}>৳{parseFloat(row.amount).toLocaleString()}</td>
                        <td>
                          <span className="sb2" style={{ background: `${methodColors[row.method] || '#ccc'}15`, color: methodColors[row.method] || '#ccc', border: `1px solid ${methodColors[row.method] || '#ccc'}30` }}>
                            {row.method}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{new Date(row.paid_at).toLocaleDateString()}</td>
                        <td>
                          <button onClick={() => openReceipt(row)} className="btn-ghost" style={{ padding: '3px 10px', fontSize: '11px', borderColor: 'rgba(0,212,255,0.3)', color: '#38E8FF' }}>
                            <Receipt size={12} /> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <>
              <div className="sc-head">
                <span className="sc-title">Pending Fees & Dues</span>
              </div>
              <div className="st-wrap">
                <table className="stitch">
                  <thead>
                    <tr><th>Invoice</th><th>Student / Customer</th><th>Description</th><th>Due Amount</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}><Loader2 size={24} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto' }} /></td></tr>
                    ) : pendingInvoices.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No pending invoices found.</td></tr>
                    ) : pendingInvoices.map((inv) => {
                      const due = parseFloat(inv.amount) - parseFloat(inv.paid);
                      return (
                        <tr key={inv.id}>
                          <td className="td-mono">{inv.invoice_no}</td>
                          <td className="td-name">{getInvoiceStudentName(inv)}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{inv.invoice_type === 'custom' ? (inv.IncomeCategory?.name || 'Manual Invoice') : (inv.Enrollment?.Batch?.Course?.title || 'Tuition Fee')}{inv.invoice_type === 'custom' ? <span className="sb2" style={{ marginLeft: 6, fontSize: 9, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', borderColor: 'rgba(6,182,212,0.3)' }}>Custom</span> : ''}</td>
                          <td style={{ fontWeight: 700, color: '#275fa7' }}>৳{due.toLocaleString()}</td>
                          <td><span className="sb2 sb2-amber" style={{ background: 'rgba(39,95,167,0.1)', color: '#275fa7', borderColor: 'rgba(39,95,167,0.3)' }}>{inv.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => {
                                const referral = getInvoiceReferralInfo(inv);
                                setSelectedInvoice(inv);
                                setPaymentData((prev) => ({ ...prev, amount: due, referral_amount: referral.amount }));
                                setShowCollectModal(true);
                              }} className="btn-stitch" style={{ padding: '4px 10px', fontSize: '11px', background: '#7bc62e' }}>Collect</button>
                              <button onClick={() => { setSelectedInvoice(inv); setRejectNote(''); setShowRejectModal(true); }} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '11px', borderColor: 'rgba(71,85,105,0.3)', color: '#475569' }}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Payment Channels */}
        <div className="sc">
          <div className="sc-head">
            <span className="sc-title">Payment Channels</span>
          </div>
          <div className="sc-body">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#e2136e 0% 57%, #f6921e 57% 84%, #3b82f6 84% 96%, #10b981 96% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '800' }}>5</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>Channels</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(methodColors).map((ch) => (
                <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: methodColors[ch] }}></span>
                  <span style={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-main)' }}>{ch.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collect Fee Modal */}
      <Modal isOpen={showCollectModal} onClose={() => setShowCollectModal(false)} title={selectedInvoice?.invoice_type === 'custom' ? 'Collect Custom Income' : 'Collect Enrollment Fee'}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const isCustom = selectedInvoice?.invoice_type === 'custom' || !selectedInvoice?.enrollment_id;
            const endpoint = isCustom ? '/pos/collect-custom-income' : '/pos/collect-fee';
            const payload = {
              invoice_id: selectedInvoice.id,
              amount: paymentData.amount,
              method: paymentData.method,
              account_id: paymentData.account_id,
              transaction_ref: paymentData.transaction_ref,
              notes: paymentData.notes
            };
            if (!isCustom) {
              payload.enrollment_id = selectedInvoice.enrollment_id;
              payload.referral_amount = paymentData.referral_amount;
            }
            const res = await api.post(endpoint, payload);
            setShowCollectModal(false);
            setSelectedInvoice(null);
            setPaymentData({ amount: '', account_id: liquidAccounts[0]?.id || '', method: mapAccountToMethod(liquidAccounts[0]), transaction_ref: '', notes: '', referral_amount: 0 });
            alert(res.data.message || 'Payment collected and Journal recorded!');
            fetchData();
          } catch(err) {
            alert(err.response?.data?.error || 'Failed to collect payment');
          } finally {
            setSubmitting(false);
          }
        }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          
          <div style={{ gridColumn: 'span 2', background: 'var(--bg-deep)', padding: '12px', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px' }}>{selectedInvoice?.invoice_type === 'custom' ? 'Customer' : 'Student'}: <strong>{getInvoiceStudentName(selectedInvoice)}</strong></p>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>Invoice: {selectedInvoice?.invoice_no} {selectedInvoice?.invoice_type === 'custom' && <span style={{ color: '#06b6d4', fontSize: '11px' }}>(Custom Income)</span>}</p>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>Due: <strong style={{color: '#FFB347'}}>৳{parseFloat(selectedInvoice?.amount) - parseFloat(selectedInvoice?.paid)}</strong></p>
            {selectedInvoice?.invoice_type !== 'custom' && selectedInvoice?.enrollment_id && selectedReferral.amount > 0 && (
              <>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>Referrer: <strong style={{ color: '#f59e0b' }}>{selectedReferral.referredBy || 'Not set'}</strong></p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#f59e0b' }}>This will create a pending expense for approval in Expense Management.</p>
              </>
            )}
          </div>

          <div className="fgroup">
            <label className="flabel">Amount (BDT)</label>
            <input required type="number" step="0.01" className="glass-input" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} />
          </div>

          <div className="fgroup">
            <label className="flabel">Referral Amount</label>
            <input type="number" step="0.01" className="glass-input" value={paymentData.referral_amount} onChange={e => setPaymentData({...paymentData, referral_amount: e.target.value})} disabled={selectedInvoice?.invoice_type === 'custom' || !selectedInvoice?.enrollment_id} placeholder="0.00" title={selectedInvoice?.invoice_type === 'custom' ? "Not applicable for custom invoices" : ""} style={Number(paymentData.referral_amount || 0) > 0 ? { borderColor: 'rgba(245,158,11,0.7)', boxShadow: '0 0 0 1px rgba(245,158,11,0.25)' } : undefined} />
            {selectedInvoice?.invoice_type !== 'custom' && selectedInvoice?.enrollment_id && Number(paymentData.referral_amount || 0) > 0 && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#f59e0b' }}>
                Referral payout will stay pending until approved from Expense Management.
              </div>
            )}
          </div>

          <div className="fgroup">
            <label className="flabel">Deposit To Account</label>
            <select className="glass-input" value={paymentData.account_id} onChange={e => {
              const acc = liquidAccounts.find(a => a.id.toString() === e.target.value);
              setPaymentData({...paymentData, account_id: e.target.value, method: mapAccountToMethod(acc)});
            }}>
              {liquidAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.sub_type.toUpperCase()})</option>
              ))}
              {liquidAccounts.length === 0 && <option value="">No Accounts Found</option>}
            </select>
          </div>

          <div className="fgroup" style={{ gridColumn: 'span 2' }}>
            <label className="flabel">Transaction Ref (if Online/Card/Bank)</label>
            <input className="glass-input" value={paymentData.transaction_ref} onChange={e => setPaymentData({...paymentData, transaction_ref: e.target.value})} placeholder="TrxID / Cheque No" />
          </div>

          <button type="submit" disabled={submitting} className="btn-stitch" style={{ gridColumn: 'span 2', padding: '12px', justifyContent: 'center' }}>
            {submitting ? 'Processing Ledger...' : 'Collect Fee & Record Journal Entry'}
          </button>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Pending Fee">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const res = await api.post('/pos/reject-fee', {
              invoice_id: selectedInvoice?.id,
              rejection_note: rejectNote
            });
            setShowRejectModal(false);
            setSelectedInvoice(null);
            setRejectNote('');
            alert(res.data.message || 'Pending fee rejected.');
            fetchData();
          } catch (err) {
            alert(err.response?.data?.error || 'Failed to reject fee');
          } finally {
            setSubmitting(false);
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--bg-deep)', padding: '12px', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px' }}>Student: <strong>{getInvoiceStudentName(selectedInvoice)}</strong></p>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>Invoice: {selectedInvoice?.invoice_no}</p>
          </div>
          <div className="fgroup">
            <label className="flabel">Rejection Note *</label>
            <textarea required className="glass-input" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Explain why this fee was rejected" style={{ minHeight: '100px', resize: 'vertical' }} />
          </div>
          <button type="submit" disabled={submitting || !rejectNote.trim()} className="btn-stitch" style={{ padding: '12px', justifyContent: 'center', background: 'linear-gradient(135deg, #FF4D6D, #9B6DFF)' }}>
            {submitting ? 'Saving rejection...' : 'Reject Fee With Note'}
          </button>
        </form>
      </Modal>

      {/* ═══ Branded Receipt Modal ═══ */}
      <Modal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} title="Official Receipt">
        {selectedTx && (
          <div>
            <div dangerouslySetInnerHTML={{ __html: receiptHtmlContent }} style={{ marginBottom: '16px' }} />
            <button onClick={() => downloadReceiptPdf(selectedTx)} className="btn-stitch" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              <Download size={16} /> Download Receipt PDF
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default POSFees;
