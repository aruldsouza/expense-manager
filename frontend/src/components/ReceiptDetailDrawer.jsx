/**
 * ReceiptDetailDrawer.jsx  — Task 7.4: View extracted receipt details from expense
 *
 * A slide-in side drawer that shows the full stored receipt metadata
 * for any expense that was created via receipt scanning.
 *
 * Props:
 *   expense   {object}  — the expense object (must have expense.receiptMeta)
 *   onClose()           — close the drawer
 */

import React from 'react';

const fmt = (v, cur = '') =>
  v != null ? `${cur} ${parseFloat(v).toFixed(2)}`.trim() : '—';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return String(d); }
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 1100,
    animation: 'rdd-fade 0.18s ease-out',
  },
  drawer: {
    position: 'fixed', top: 0, right: 0,
    height: '100vh', width: '100%', maxWidth: '420px',
    background: 'rgba(14,20,36,0.99)',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column',
    animation: 'rdd-slide 0.22s cubic-bezier(0.22,1,0.36,1)',
    zIndex: 1101,
    overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.2rem 1.4rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
    background: 'rgba(14,20,36,0.99)',
    position: 'sticky', top: 0, zIndex: 2,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem', fontWeight: '700', color: '#fff',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  closeBtn: {
    width: '30px', height: '30px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%', color: 'var(--text-muted)',
    fontSize: '0.95rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  body: { padding: '1.2rem 1.4rem', flex: 1 },
  aiBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.25rem 0.65rem',
    background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(6,182,212,0.12))',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '999px', fontSize: '0.74rem', fontWeight: '600',
    color: 'var(--accent-cyan)', marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '0.78rem', fontWeight: '700',
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '0.6rem',
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    marginTop: '1.1rem',
  },
  infoCard: {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '0.85rem',
    marginBottom: '0.75rem',
  },
  row: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '0.28rem 0',
    fontSize: '0.86rem',
  },
  rowLabel: { color: 'var(--text-muted)' },
  rowValue: { fontWeight: '600', color: '#fff' },
  divider: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    margin: '0.45rem 0',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: '0.4rem',
    fontWeight: '700', fontSize: '1rem',
    color: 'var(--accent-emerald)',
  },
  itemRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: '0.85rem',
    gap: '0.5rem',
  },
  itemName: { flex: 1, color: '#fff', fontWeight: '500' },
  itemMeta: { color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.1rem' },
  itemPrice: { color: 'var(--accent-emerald)', fontWeight: '700', flexShrink: 0 },
  scannedBadge: {
    background: 'rgba(16,185,129,0.07)',
    border: '1px solid rgba(16,185,129,0.15)',
    borderRadius: '8px', padding: '0.5rem 0.75rem',
    fontSize: '0.78rem', color: 'var(--text-dim)',
    marginTop: '1.25rem',
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function ReceiptDetailDrawer({ expense, onClose }) {
  const meta = expense?.receiptMeta;
  const currency = meta?.currency || '';

  if (!meta) return null;

  return (
    <>
      <style>{`
        @keyframes rdd-fade  { from{opacity:0} to{opacity:1} }
        @keyframes rdd-slide { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .rdd-close:hover { background:rgba(255,255,255,0.14)!important; }
      `}</style>

      {/* Backdrop */}
      <div style={S.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={S.drawer} role="dialog" aria-label="Receipt details">

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.title}>
            <span style={{
              width: '28px', height: '28px',
              background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
              borderRadius: '7px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0,
            }}>📷</span>
            Receipt Details
          </div>
          <button style={S.closeBtn} className="rdd-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={S.body}>

          {/* ── AI badge ── */}
          <div style={S.aiBadge}>✨ Gemini AI · Scanned Receipt</div>

          {/* ── Expense title link ── */}
          <p style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '0.2rem' }}>
            {expense.title}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
            {expense.category} &nbsp;·&nbsp; {fmtDate(expense.date)}
          </p>

          {/* ── Merchant & Date ── */}
          <div style={S.infoCard}>
            {meta.merchant && (
              <div style={S.row}>
                <span style={S.rowLabel}>🏪 Merchant</span>
                <span style={S.rowValue}>{meta.merchant}</span>
              </div>
            )}
            {meta.currency && (
              <div style={S.row}>
                <span style={S.rowLabel}>💱 Currency</span>
                <span style={S.rowValue}>{meta.currency}</span>
              </div>
            )}
            {meta.scannedAt && (
              <div style={S.row}>
                <span style={S.rowLabel}>🔍 Scanned</span>
                <span style={{ ...S.rowValue, fontSize: '0.82rem' }}>{fmtDate(meta.scannedAt)}</span>
              </div>
            )}
          </div>

          {/* ── Line Items ── */}
          {meta.lineItems?.length > 0 && (
            <>
              <p style={S.sectionTitle}>📦 Line Items</p>
              <div style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', padding: '0.4rem 0.85rem',
                marginBottom: '0.75rem',
              }}>
                {meta.lineItems.map((item, i) => (
                  <div key={i} style={{
                    ...S.itemRow,
                    borderBottom: i < meta.lineItems.length - 1
                      ? S.itemRow.borderBottom
                      : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={S.itemName}>{item.name || `Item ${i + 1}`}</div>
                      {item.quantity != null && (
                        <div style={S.itemMeta}>
                          ×{item.quantity}
                          {item.unitPrice != null ? ` @ ${fmt(item.unitPrice, currency)}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={S.itemPrice}>
                      {item.totalPrice != null ? fmt(item.totalPrice, currency) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Charges & Totals ── */}
          <p style={S.sectionTitle}>🧾 Charges & Total</p>
          <div style={S.infoCard}>
            {meta.subtotal != null && (
              <div style={S.row}>
                <span style={S.rowLabel}>Subtotal</span>
                <span style={S.rowValue}>{fmt(meta.subtotal, currency)}</span>
              </div>
            )}
            {meta.tax != null && (
              <div style={S.row}>
                <span style={S.rowLabel}>Tax / GST / VAT</span>
                <span style={{ ...S.rowValue, color: 'var(--accent-amber)' }}>+{fmt(meta.tax, currency)}</span>
              </div>
            )}
            {meta.serviceCharge != null && (
              <div style={S.row}>
                <span style={S.rowLabel}>Service / Delivery</span>
                <span style={{ ...S.rowValue, color: 'var(--accent-amber)' }}>+{fmt(meta.serviceCharge, currency)}</span>
              </div>
            )}
            {meta.discount != null && (
              <div style={S.row}>
                <span style={S.rowLabel}>Discount</span>
                <span style={{ ...S.rowValue, color: 'var(--accent-emerald)' }}>−{fmt(meta.discount, currency)}</span>
              </div>
            )}

            <div style={S.divider} />
            <div style={S.totalRow}>
              <span>Grand Total</span>
              <span>{fmt(expense.amount, currency)}</span>
            </div>
          </div>

          {/* ── Scanned-at footer ── */}
          <div style={S.scannedBadge}>
            🤖 Extracted by <strong style={{ color: 'var(--accent-cyan)' }}>Gemini AI</strong>
            {meta.scannedAt && (
              <> &nbsp;·&nbsp; {fmtDate(meta.scannedAt)}</>
            )}
            <br />
            <span style={{ fontSize: '0.74rem', marginTop: '0.2rem', display: 'block' }}>
              Values may differ slightly from the original receipt due to AI extraction.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
