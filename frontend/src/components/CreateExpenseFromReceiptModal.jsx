/**
 * CreateExpenseFromReceiptModal.jsx  — Task 5: Automatic Expense Creation
 *
 * Takes confirmed receipt data (from ScanReceiptModal) and creates an expense
 * directly using the existing expense creation API.
 *
 * Task mapping:
 *   5.1 — "Create Expense" CTA is the primary action of this modal
 *   5.2 — Maps receipt fields → expense schema (title, amount, paidBy, category, date, splits)
 *   5.3 — Auto-populates all fields from scannedData; user can still edit
 *   5.4 — Calls api.addExpense(groupId, payload) — the existing expense API
 *   5.5 — Button is disabled + shows spinner after first click (prevents duplicates)
 *
 * Props:
 *   receiptData   {object}   — confirmed data from ScanReceiptModal
 *   group         {object}   — current group (for members list, currency)
 *   currentUser   {object}   — logged-in user (default paidBy)
 *   onSuccess()             — called after expense is created successfully
 *   onClose()               — called to close without creating
 */

import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import SmartSplitModal from './SmartSplitModal';

/* ─── Style tokens (match existing dark glassmorphic system) ───────────────── */
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.82)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1001, padding: '1rem',
    animation: 'cef-fade 0.2s ease-out',
  },
  modal: {
    width: '100%', maxWidth: '620px',
    maxHeight: '92vh', overflowY: 'auto',
    background: 'rgba(18,24,39,0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.4rem 1.6rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem', fontWeight: '700', color: '#fff',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  body: { padding: '1.4rem 1.6rem' },
  footer: {
    padding: '1rem 1.6rem 1.4rem',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
  },
  label: {
    fontSize: '0.78rem', color: 'var(--text-muted)',
    fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: '0.04em', display: 'block', marginBottom: '0.3rem',
  },
  input: {
    width: '100%', background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: '#fff', fontSize: '0.93rem', outline: 'none',
    fontFamily: 'var(--font-main)', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: '#fff', fontSize: '0.93rem', outline: 'none',
    fontFamily: 'var(--font-main)', boxSizing: 'border-box',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  formGroup: { display: 'flex', flexDirection: 'column', marginBottom: '0.9rem' },
  receiptSummary: {
    background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(6,182,212,0.06))',
    border: '1px solid rgba(99,102,241,0.22)',
    borderRadius: '12px', padding: '1rem 1.1rem',
    marginBottom: '1.25rem',
  },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', fontSize: '0.85rem',
    padding: '0.25rem 0',
  },
  divider: { borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0.6rem 0' },
  totalRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', fontWeight: '700', fontSize: '1.05rem',
    color: 'var(--accent-emerald)', paddingTop: '0.4rem',
  },
  aiBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.25rem 0.65rem',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '999px', fontSize: '0.74rem', fontWeight: '600',
    color: 'var(--primary)', marginBottom: '0.6rem',
  },
  memberChip: (selected) => ({
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.45rem 0.7rem',
    background: selected ? 'rgba(99,102,241,0.18)' : 'rgba(15,23,42,0.5)',
    border: `1px solid ${selected ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '8px', cursor: 'pointer',
    transition: 'all 0.2s', fontSize: '0.85rem', userSelect: 'none',
    color: selected ? '#fff' : 'var(--text-muted)',
  }),
  avatar: {
    width: '26px', height: '26px', borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.72rem', fontWeight: '700', flexShrink: 0,
  },
  errorBox: {
    background: 'rgba(244,63,94,0.1)',
    border: '1px solid rgba(244,63,94,0.3)',
    borderRadius: '8px', padding: '0.75rem 1rem',
    color: 'var(--accent-rose)', fontSize: '0.88rem',
    marginTop: '0.75rem',
  },
  successBox: {
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '8px', padding: '0.75rem 1rem',
    color: 'var(--accent-emerald)', fontSize: '0.88rem',
    marginTop: '0.75rem',
  },
  btnPrimary: (disabled) => ({
    background: disabled
      ? 'rgba(99,102,241,0.4)'
      : 'linear-gradient(135deg, var(--primary), #4338ca)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.75rem 1.6rem', fontSize: '0.93rem', fontWeight: '700',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    opacity: disabled ? 0.65 : 1,
  }),
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-main)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', padding: '0.75rem 1.3rem',
    fontSize: '0.92rem', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  sectionHeading: {
    fontSize: '0.82rem', fontWeight: '700',
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '0.6rem',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
  },
  closeBtn: {
    width: '32px', height: '32px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%', color: 'var(--text-muted)',
    fontSize: '1rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};

const CATEGORIES = [
  'Food & Dining', 'Grocery', 'Shopping', 'Transportation',
  'Healthcare', 'Entertainment', 'Utilities', 'Travel',
  'Education', 'Personal Care', 'Electronics', 'General', 'Other',
];

/* ─── Helper ─────────────────────────────────────────────────────────────── */
const fmtAmount = (v, currency = '') => {
  if (v == null) return '—';
  return `${currency} ${parseFloat(v).toFixed(2)}`.trim();
};

const getMemberId = (m) => m._id || m.id || '';
const getMemberName = (m) => m.name || m.email || 'Member';

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function CreateExpenseFromReceiptModal({
  receiptData,
  group,
  currentUser,
  onSuccess,
  onClose,
}) {
  const currency = receiptData.currency || group.currency || 'INR';
  const members  = group.members || [];

  /* ── Task 5.3: Auto-populate all fields from receipt ── */
  const [title, setTitle]       = useState(receiptData.merchant || '');
  const [amount, setAmount]     = useState(
    receiptData.total != null ? String(receiptData.total) : ''
  );
  const [date, setDate]         = useState(receiptData.date || '');
  const [category, setCategory] = useState(receiptData.category || 'Other');
  const [paidBy, setPaidBy]     = useState(
    currentUser ? (currentUser._id || currentUser.id || '') : ''
  );

  /* ── Split participants (default: all members, equal split) ── */
  const [selectedMembers, setSelectedMembers] = useState(
    members.map(m => getMemberId(m))
  );

  /* ── Task 5.5: Saving state — disable button after first click ── */
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);   // lock after success
  const [error, setError]       = useState('');
  const saveInProgress          = useRef(false);     // extra guard

  /* ── Task 6 state: smart split ── */
  const [showSmartSplit, setShowSmartSplit] = useState(false);
  const [smartSplits, setSmartSplits]       = useState(null);  // null = equal split

  /* ── Toggle a member in/out of the split ── */
  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  /* ── Task 5.2: Map receipt → expense schema ── */
  const buildExpensePayload = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) throw new Error('Amount must be a positive number.');
    if (!title.trim()) throw new Error('Expense title (merchant name) is required.');
    if (!paidBy) throw new Error('Please select who paid this expense.');
    if (selectedMembers.length === 0) throw new Error('Please select at least one member to split with.');

    let splits;
    let splitType = 'equal';

    // Task 6: use smart splits if the user applied them
    if (smartSplits && smartSplits.length > 0) {
      splits    = smartSplits;
      splitType = 'unequal';
    } else {
      // Fallback: equal split among selected members
      const perPerson = parseFloat((numAmount / selectedMembers.length).toFixed(2));
      let assigned = 0;
      splits = selectedMembers.map((uid, idx) => {
        let share = perPerson;
        if (idx === selectedMembers.length - 1) {
          share = parseFloat((numAmount - assigned).toFixed(2));
        } else {
          assigned += share;
        }
        return {
          user:       uid,
          amount:     share,
          percentage: parseFloat(((share / numAmount) * 100).toFixed(2)),
        };
      });
    }

    return {
      title:     title.trim(),
      amount:    numAmount,
      paidBy,
      category,
      date:      date || undefined,
      splitType,
      splits,
      // Store receipt metadata for Task 7 (receipt history)
      receiptMeta: {
        merchant:      receiptData.merchant,
        currency,
        subtotal:      receiptData.subtotal,
        tax:           receiptData.tax,
        discount:      receiptData.discount,
        serviceCharge: receiptData.serviceCharge,
        lineItems:     receiptData.lineItems,
        scannedAt:     new Date().toISOString(),
      },
    };
  };

  /* ── Task 5.4 & 5.5: Create expense (with duplicate prevention) ── */
  const handleCreate = async () => {
    // Task 5.5: Hard block — if already saved or in progress, do nothing
    if (saved || saveInProgress.current) return;

    setError('');

    let payload;
    try {
      payload = buildExpensePayload();
    } catch (validationErr) {
      setError(validationErr.message);
      return;
    }

    // Task 5.5: Set both ref (sync) and state (async) immediately
    saveInProgress.current = true;
    setSaving(true);

    try {
      // Task 5.4: Use existing expense creation API
      await api.addExpense(group._id, payload);

      setSaved(true);
      setSaving(false);

      // Brief success flash, then close + refresh group data
      setTimeout(() => {
        onSuccess();
      }, 900);

    } catch (err) {
      saveInProgress.current = false;   // allow retry on real error
      setSaving(false);
      setError(err.message || 'Failed to create expense. Please try again.');
    }
  };

  const isButtonDisabled = saving || saved;

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <style>{`
        @keyframes cef-fade { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .cef-input:focus { border-color:var(--primary)!important; box-shadow:0 0 0 3px rgba(99,102,241,0.22); }
        .cef-btn-sec:hover { background:rgba(255,255,255,0.1)!important; }
        .cef-chip:hover { border-color:rgba(99,102,241,0.5)!important; }
        .cef-spin { animation: cef-rotate 0.8s linear infinite; }
        @keyframes cef-rotate { to{transform:rotate(360deg)} }
      `}</style>

      <div style={S.modal}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.title}>
            <span style={{
              width:'30px', height:'30px',
              background:'linear-gradient(135deg,#10b981,#06b6d4)',
              borderRadius:'8px', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:'1rem', flexShrink:0,
            }}>💳</span>
            Create Expense from Receipt
          </div>
          <button style={S.closeBtn} onClick={onClose} disabled={saving} aria-label="Close">✕</button>
        </div>

        <div style={S.body}>

          {/* ── AI badge ── */}
          <div style={S.aiBadge}>✨ Gemini AI · Receipt Scanned</div>

          {/* ── Receipt summary card ── */}
          <div style={S.receiptSummary}>
            <p style={{ fontSize:'0.8rem', fontWeight:'700', color:'var(--text-muted)',
              textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>
              Receipt Summary
            </p>

            {receiptData.merchant && (
              <div style={S.summaryRow}>
                <span style={{ color:'var(--text-muted)' }}>🏪 Merchant</span>
                <span style={{ fontWeight:'600' }}>{receiptData.merchant}</span>
              </div>
            )}
            {receiptData.date && (
              <div style={S.summaryRow}>
                <span style={{ color:'var(--text-muted)' }}>📅 Date</span>
                <span>{receiptData.date}</span>
              </div>
            )}
            {receiptData.lineItems?.length > 0 && (
              <div style={S.summaryRow}>
                <span style={{ color:'var(--text-muted)' }}>📦 Items</span>
                <span>{receiptData.lineItems.length} line item{receiptData.lineItems.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {(receiptData.subtotal != null || receiptData.tax != null || receiptData.discount != null || receiptData.serviceCharge != null) && (
              <>
                <div style={S.divider} />
                {receiptData.subtotal != null && (
                  <div style={S.summaryRow}>
                    <span style={{ color:'var(--text-muted)' }}>Subtotal</span>
                    <span>{fmtAmount(receiptData.subtotal, currency)}</span>
                  </div>
                )}
                {receiptData.tax != null && (
                  <div style={S.summaryRow}>
                    <span style={{ color:'var(--text-muted)' }}>Tax / GST</span>
                    <span>{fmtAmount(receiptData.tax, currency)}</span>
                  </div>
                )}
                {receiptData.discount != null && (
                  <div style={S.summaryRow}>
                    <span style={{ color:'var(--accent-emerald)' }}>Discount</span>
                    <span style={{ color:'var(--accent-emerald)' }}>-{fmtAmount(receiptData.discount, currency)}</span>
                  </div>
                )}
                {receiptData.serviceCharge != null && (
                  <div style={S.summaryRow}>
                    <span style={{ color:'var(--text-muted)' }}>Service / Delivery</span>
                    <span>{fmtAmount(receiptData.serviceCharge, currency)}</span>
                  </div>
                )}
              </>
            )}

            <div style={S.divider} />
            <div style={S.totalRow}>
              <span>Grand Total</span>
              <span>{fmtAmount(receiptData.total, currency)}</span>
            </div>
          </div>

          {/* ── Task 5.3: Editable expense fields ── */}
          <div style={S.formGroup}>
            <label style={S.label} htmlFor="cef-title">📝 Expense Title</label>
            <input
              id="cef-title"
              className="cef-input"
              style={S.input}
              type="text"
              placeholder="Expense description"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={saved}
            />
          </div>

          <div style={{ ...S.grid2, marginBottom: '0.9rem' }}>
            <div>
              <label style={S.label} htmlFor="cef-amount">💰 Amount ({currency})</label>
              <input
                id="cef-amount"
                className="cef-input"
                style={S.input}
                type="number"
                min="0.01" step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={saved}
              />
            </div>
            <div>
              <label style={S.label} htmlFor="cef-date">📅 Date</label>
              <input
                id="cef-date"
                className="cef-input"
                style={S.input}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={saved}
              />
            </div>
          </div>

          <div style={{ ...S.grid2, marginBottom: '0.9rem' }}>
            <div>
              <label style={S.label} htmlFor="cef-category">🏷️ Category</label>
              <select
                id="cef-category"
                className="cef-input"
                style={S.select}
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={saved}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label} htmlFor="cef-paid-by">👤 Paid By</label>
              <select
                id="cef-paid-by"
                className="cef-input"
                style={S.select}
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                disabled={saved}
              >
                <option value="">— Select member —</option>
                {members.map(m => (
                  <option key={getMemberId(m)} value={getMemberId(m)}>
                    {getMemberName(m)}
                    {getMemberId(m) === (currentUser?._id || currentUser?.id) ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Split section ── */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
              <p style={S.sectionHeading}>👥 Split Among</p>
              {/* Task 6.1 — Smart Split trigger */}
              {receiptData.lineItems?.length > 0 && !saved && (
                <button
                  id="smart-split-btn"
                  style={{
                    background: smartSplits
                      ? 'rgba(245,158,11,0.15)'
                      : 'rgba(99,102,241,0.12)',
                    border: `1px solid ${smartSplits ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.35)'}`,
                    color: smartSplits ? 'var(--accent-amber)' : 'var(--primary)',
                    borderRadius: '6px', padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setShowSmartSplit(true)}
                >
                  {smartSplits ? '🔀 Edit Smart Split' : '🔀 Smart Split by Items'}
                </button>
              )}
            </div>
            {/* Smart split summary badge */}
            {smartSplits && (
              <div style={{
                marginBottom:'0.65rem', padding:'0.5rem 0.85rem',
                background:'rgba(245,158,11,0.08)',
                border:'1px solid rgba(245,158,11,0.25)',
                borderRadius:'8px', fontSize:'0.82rem',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                  <span style={{ color:'var(--accent-amber)', fontWeight:'700' }}>🔀 Smart Split Active</span>
                  <button
                    style={{ background:'none', border:'none', color:'var(--text-dim)',
                      fontSize:'0.78rem', cursor:'pointer', padding:0 }}
                    onClick={() => setSmartSplits(null)}
                  >↺ Use equal split</button>
                </div>
                {smartSplits.map(s => {
                  const m = members.find(m => getMemberId(m) === s.user);
                  return m ? (
                    <div key={s.user} style={{ display:'flex', justifyContent:'space-between',
                      color:'var(--text-muted)', fontSize:'0.8rem' }}>
                      <span>{getMemberName(m)}</span>
                      <span style={{ color:'#fff', fontWeight:'600' }}>{currency} {s.amount.toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {members.map(m => {
                const id       = getMemberId(m);
                const name     = getMemberName(m);
                const isMe     = id === (currentUser?._id || currentUser?.id);
                const selected = selectedMembers.includes(id);
                return (
                  <div
                    key={id}
                    className="cef-chip"
                    style={S.memberChip(selected)}
                    onClick={() => !saved && toggleMember(id)}
                  >
                    <div style={S.avatar}>{name.charAt(0).toUpperCase()}</div>
                    <span>{name}{isMe ? ' (You)' : ''}</span>
                    {selected && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem' }}>✓</span>}
                  </div>
                );
              })}
            </div>
            {selectedMembers.length > 0 && amount && parseFloat(amount) > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                ≈ {currency} {(parseFloat(amount) / selectedMembers.length).toFixed(2)} per person
                &nbsp;·&nbsp; equal split among {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* ── Feedback ── */}
          {error && <div style={S.errorBox}>⚠️ {error}</div>}
          {saved && (
            <div style={S.successBox}>
              ✅ Expense created successfully! Refreshing group data…
            </div>
          )}
        </div>

        {/* ── Footer / CTA (Task 5.1 & 5.5) ── */}
        <div style={S.footer}>
          <button
            style={S.btnSecondary}
            className="cef-btn-sec"
            onClick={onClose}
            disabled={saving || saved}
          >
            Cancel
          </button>

          {/* Task 5.1 — "Create Expense" action */}
          {/* Task 5.5 — disabled while saving OR after successful save */}
          <button
            id="create-expense-from-receipt-btn"
            style={S.btnPrimary(isButtonDisabled)}
            onClick={handleCreate}
            disabled={isButtonDisabled}
          >
            {saving ? (
              <>
                <span
                  className="cef-spin"
                  style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%', display: 'inline-block',
                  }}
                />
                Creating…
              </>
            ) : saved ? (
              '✅ Created!'
            ) : (
              '💳 Create Expense'
            )}
          </button>
        </div>
      </div>

      {/* Task 6 — Smart Split Modal (rendered on top) */}
      {showSmartSplit && (
        <SmartSplitModal
          receiptData={receiptData}
          members={members}
          paidBy={paidBy}
          currency={currency}
          totalAmount={parseFloat(amount) || receiptData.total || 0}
          onClose={() => setShowSmartSplit(false)}
          onConfirm={(splits) => {
            setSmartSplits(splits);
            setShowSmartSplit(false);
          }}
        />
      )}
    </div>
  );
}
