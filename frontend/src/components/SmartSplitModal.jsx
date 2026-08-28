/**
 * SmartSplitModal.jsx  — Task 6: Smart Split Suggestions
 *
 * A full item-level split assignment UI built on the extracted receipt line items.
 *
 * Task mapping:
 *   6.1 — AI-suggested split: shows each item with an auto-assignment suggestion
 *          (member who paid gets all items by default as a starting point)
 *   6.2 — Per-item member checkboxes: each member can be assigned to any item
 *   6.3 — Auto-calculates each member's share from their assigned item totals
 *   6.4 — Shared items: when multiple members are checked on an item,
 *          the item cost is divided equally among them
 *   6.5 — Tax, discount, and service charge are distributed proportionally
 *          based on each member's share of the item subtotal
 *   6.6 — Manual override: each member's final amount has an editable input;
 *          a live diff shows how much the override deviates from the suggestion
 *
 * Props:
 *   receiptData  {object}   — full receipt object (lineItems, tax, discount, etc.)
 *   members      {Array}    — group members [{_id, name, email}]
 *   paidBy       {string}   — userId of who paid (used for default assignment)
 *   currency     {string}   — display currency code
 *   totalAmount  {number}   — grand total to reconcile against
 *   onConfirm(splits)       — called with final splits array [{user, amount, percentage}]
 *   onClose()               — close without confirming
 */

import React, { useState, useMemo } from 'react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const getId   = (m) => m._id || m.id || '';
const getName = (m) => m.name || m.email || 'Member';
const p2      = (v) => parseFloat(v.toFixed(2));
const fmt     = (v, cur = '') => `${cur} ${p2(v || 0).toFixed(2)}`.trim();

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1002, padding: '1rem',
    animation: 'ss-fade 0.2s ease-out',
  },
  modal: {
    width: '100%', maxWidth: '820px',
    maxHeight: '92vh', overflowY: 'auto',
    background: 'rgba(14,20,36,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.4rem 1.6rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    position: 'sticky', top: 0,
    background: 'rgba(14,20,36,0.98)',
    backdropFilter: 'blur(8px)', zIndex: 2,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem', fontWeight: '700', color: '#fff',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  body: { padding: '1.2rem 1.4rem' },
  footer: {
    padding: '1rem 1.4rem 1.4rem',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
    position: 'sticky', bottom: 0,
    background: 'rgba(14,20,36,0.98)',
    backdropFilter: 'blur(8px)', zIndex: 2,
  },
  /* Item table */
  table: {
    width: '100%', borderCollapse: 'collapse',
    marginBottom: '1.25rem', fontSize: '0.86rem',
  },
  th: {
    padding: '0.5rem 0.6rem',
    color: 'var(--text-dim)', fontWeight: '600',
    textTransform: 'uppercase', fontSize: '0.72rem',
    letterSpacing: '0.05em', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  thRight: { textAlign: 'right' },
  td: {
    padding: '0.55rem 0.6rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
  },
  tdRight: { textAlign: 'right' },
  itemRow: (hover) => ({
    background: hover ? 'rgba(99,102,241,0.06)' : 'transparent',
    transition: 'background 0.15s',
  }),
  checkbox: (checked) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '20px', height: '20px',
    background: checked ? 'var(--primary)' : 'rgba(15,23,42,0.7)',
    border: `2px solid ${checked ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
    borderRadius: '5px', cursor: 'pointer', flexShrink: 0,
    fontSize: '0.7rem', color: '#fff',
    transition: 'all 0.15s', userSelect: 'none',
  }),
  memberHeader: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '0.2rem',
    padding: '0.2rem',
  },
  avatar: (color) => ({
    width: '26px', height: '26px', borderRadius: '50%',
    background: color, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '0.72rem', fontWeight: '700', flexShrink: 0,
  }),
  /* Summary section */
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '0.75rem', marginBottom: '1.25rem',
  },
  summaryCard: (isOverridden) => ({
    background: isOverridden
      ? 'rgba(245,158,11,0.08)'
      : 'rgba(15,23,42,0.6)',
    border: `1px solid ${isOverridden ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: '10px', padding: '0.8rem',
  }),
  overrideInput: {
    width: '100%', background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px', padding: '0.4rem 0.6rem',
    color: '#fff', fontSize: '0.88rem', outline: 'none',
    fontFamily: 'var(--font-main)', marginTop: '0.3rem',
    boxSizing: 'border-box',
  },
  chargesCard: {
    background: 'rgba(6,182,212,0.07)',
    border: '1px solid rgba(6,182,212,0.15)',
    borderRadius: '10px', padding: '0.85rem 1rem',
    marginBottom: '1.25rem', fontSize: '0.84rem',
  },
  chargeRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '0.2rem 0', color: 'var(--text-muted)',
  },
  warningBox: {
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '8px', padding: '0.65rem 0.9rem',
    color: 'var(--accent-amber)', fontSize: '0.82rem',
    marginBottom: '0.75rem',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, var(--primary), #4338ca)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.72rem 1.5rem', fontSize: '0.92rem', fontWeight: '700',
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-main)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', padding: '0.72rem 1.3rem',
    fontSize: '0.92rem', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  sectionTitle: {
    fontSize: '0.82rem', fontWeight: '700',
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '0.7rem',
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

/* ─── Avatar colours (deterministic per member index) ──────────────────── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#06b6d4)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#06b6d4,#6366f1)',
  'linear-gradient(135deg,#f43f5e,#f59e0b)',
];

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function SmartSplitModal({
  receiptData,
  members,
  paidBy,
  currency,
  totalAmount,
  onConfirm,
  onClose,
}) {
  const memberIds = members.map(getId);

  /* ─── Task 6.1: Default item assignment: paidBy member gets everything ── */
  const initItems = () =>
    (receiptData.lineItems || []).map((item, i) => ({
      id:          i,
      name:        item.name || `Item ${i + 1}`,
      quantity:    item.quantity,
      unitPrice:   item.unitPrice,
      totalPrice:  item.totalPrice || 0,
      /* Task 6.2: which members are checked for this item */
      assignedTo:  Object.fromEntries(
        memberIds.map(uid => [uid, uid === paidBy])
      ),
    }));

  const [items, setItems]           = useState(initItems);
  const [hovered, setHovered]       = useState(null);
  /* Task 6.6: per-member manual override amounts */
  const [overrides, setOverrides]   = useState({});

  /* ─── Task 6.3 & 6.4 & 6.5: Compute per-member shares ─────────────────
   *
   * Algorithm:
   * 1. For each item, split totalPrice equally among checked members (Task 6.4).
   * 2. Sum each member's item shares → memberItemSubtotal.
   * 3. Compute grand item subtotal (sum of all items).
   * 4. Pro-rate tax and serviceCharge proportionally (Task 6.5).
   * 5. Pro-rate discount as a reduction (Task 6.5).
   * 6. Final = itemShare + taxShare + svcShare - discountShare.
   * 7. Round and reconcile to avoid floating-point drift.
   */
  const suggested = useMemo(() => {
    const tax     = receiptData.tax           || 0;
    const disc    = receiptData.discount       || 0;
    const svc     = receiptData.serviceCharge  || 0;

    // Step 1 & 2: item shares per member
    const memberItemTotals = {};
    memberIds.forEach(uid => { memberItemTotals[uid] = 0; });

    items.forEach(item => {
      const checkedIds = memberIds.filter(uid => item.assignedTo[uid]);
      if (checkedIds.length === 0) return;
      const share = (item.totalPrice || 0) / checkedIds.length;  // Task 6.4
      checkedIds.forEach(uid => { memberItemTotals[uid] += share; });
    });

    // Step 3: grand item subtotal (what we have distributed from line items)
    const grandItemTotal = Object.values(memberItemTotals).reduce((a, b) => a + b, 0);

    // Step 4 & 5: proportional charges
    const memberFinals = {};
    memberIds.forEach(uid => {
      const itemShare = memberItemTotals[uid];
      const ratio = grandItemTotal > 0 ? itemShare / grandItemTotal : 1 / memberIds.length;
      const taxShare  = tax  * ratio;
      const svcShare  = svc  * ratio;
      const discShare = disc * ratio;
      memberFinals[uid] = p2(itemShare + taxShare + svcShare - discShare);
    });

    // Step 7: reconcile rounding to match totalAmount
    const computedTotal = Object.values(memberFinals).reduce((a, b) => a + b, 0);
    const diff = p2(totalAmount - computedTotal);
    if (Math.abs(diff) > 0 && memberIds.length > 0) {
      // Assign rounding residual to the first member
      memberFinals[memberIds[0]] = p2(memberFinals[memberIds[0]] + diff);
    }

    return memberFinals;
  }, [items, receiptData, totalAmount, memberIds]);

  /* ─── Effective amounts: override if set, else suggested ─────────────── */
  const effective = useMemo(() => {
    const result = {};
    memberIds.forEach(uid => {
      const ov = overrides[uid];
      result[uid] = (ov !== undefined && ov !== '') ? (parseFloat(ov) || 0) : suggested[uid];
    });
    return result;
  }, [overrides, suggested, memberIds]);

  const effectiveTotal = Object.values(effective).reduce((a, b) => a + b, 0);
  const totalDiff      = p2(Math.abs(effectiveTotal - totalAmount));
  const isBalanced     = totalDiff <= 0.02;

  /* ─── Toggle member assignment on an item ────────────────────────────── */
  const toggleAssignment = (itemId, memberId) => {
    setItems(prev => prev.map(it =>
      it.id !== itemId ? it : {
        ...it,
        assignedTo: { ...it.assignedTo, [memberId]: !it.assignedTo[memberId] }
      }
    ));
  };

  /* ─── Select All / None for an item ─────────────────────────────────── */
  const selectAllForItem = (itemId, value) => {
    setItems(prev => prev.map(it =>
      it.id !== itemId ? it : {
        ...it,
        assignedTo: Object.fromEntries(memberIds.map(uid => [uid, value]))
      }
    ));
  };

  /* ─── Task 6.6: handle manual override ────────────────────────────────── */
  const handleOverride = (uid, val) => {
    setOverrides(prev => ({ ...prev, [uid]: val }));
  };
  const resetOverride = (uid) => {
    setOverrides(prev => { const n = { ...prev }; delete n[uid]; return n; });
  };

  /* ─── Confirm: build splits array ───────────────────────────────────── */
  const handleConfirm = () => {
    const splits = memberIds
      .filter(uid => effective[uid] > 0)
      .map(uid => ({
        user:       uid,
        amount:     p2(effective[uid]),
        percentage: p2((effective[uid] / totalAmount) * 100),
      }));
    onConfirm(splits);
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        @keyframes ss-fade { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .ss-cb:hover { transform:scale(1.1); }
        .ss-btn-p:hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(99,102,241,0.45)!important; }
        .ss-btn-s:hover { background:rgba(255,255,255,0.1)!important; }
        .ss-oi:focus  { border-color:var(--primary)!important; box-shadow:0 0 0 2px rgba(99,102,241,0.25); }
        .ss-row:hover td { background:rgba(99,102,241,0.04); }
      `}</style>

      <div style={S.modal}>

        {/* ── Sticky Header ── */}
        <div style={S.header}>
          <div style={S.title}>
            <span style={{
              width:'30px', height:'30px',
              background:'linear-gradient(135deg,#f59e0b,#ef4444)',
              borderRadius:'8px', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:'1rem', flexShrink:0,
            }}>🔀</span>
            Smart Split by Items
          </div>
          <button style={S.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={S.body}>

          {/* ── Instruction banner (Task 6.1) ── */}
          <div style={{
            background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(6,182,212,0.06))',
            border:'1px solid rgba(99,102,241,0.22)',
            borderRadius:'10px', padding:'0.75rem 1rem',
            marginBottom:'1.1rem', fontSize:'0.84rem',
            display:'flex', gap:'0.6rem', alignItems:'flex-start',
          }}>
            <span style={{ fontSize:'1rem', flexShrink:0 }}>✨</span>
            <span style={{ color:'var(--text-muted)', lineHeight:1.5 }}>
              <strong style={{ color:'#fff' }}>AI-suggested split</strong> — check which items belong to each member.
              Items shared by multiple members are divided equally (Task 6.4).
              Tax, discounts &amp; charges are distributed proportionally (Task 6.5).
            </span>
          </div>

          {/* ── Task 6.5: Charges display ── */}
          {(receiptData.tax || receiptData.discount || receiptData.serviceCharge) && (
            <div style={S.chargesCard}>
              <p style={{ ...S.sectionTitle, marginBottom:'0.4rem' }}>📋 Proportional Charges</p>
              {receiptData.tax != null && (
                <div style={S.chargeRow}>
                  <span>Tax / GST</span>
                  <span style={{ color:'var(--accent-amber)' }}>+{fmt(receiptData.tax, currency)}</span>
                </div>
              )}
              {receiptData.serviceCharge != null && (
                <div style={S.chargeRow}>
                  <span>Service / Delivery</span>
                  <span style={{ color:'var(--accent-amber)' }}>+{fmt(receiptData.serviceCharge, currency)}</span>
                </div>
              )}
              {receiptData.discount != null && (
                <div style={S.chargeRow}>
                  <span>Discount</span>
                  <span style={{ color:'var(--accent-emerald)' }}>−{fmt(receiptData.discount, currency)}</span>
                </div>
              )}
              <div style={{ ...S.chargeRow, borderTop:'1px solid rgba(255,255,255,0.07)', marginTop:'0.4rem', paddingTop:'0.4rem', fontWeight:'700', color:'#fff' }}>
                <span>Grand Total</span>
                <span>{fmt(totalAmount, currency)}</span>
              </div>
            </div>
          )}

          {/* ── Task 6.2: Item assignment table ── */}
          <p style={S.sectionTitle}>📦 Assign Items to Members</p>
          <div style={{ overflowX: 'auto', marginBottom: '0.25rem' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Item</th>
                  <th style={{ ...S.th, ...S.thRight }}>Total</th>
                  {/* Member columns */}
                  {members.map((m, mi) => (
                    <th key={getId(m)} style={{ ...S.th, textAlign:'center', minWidth:'60px' }}>
                      <div style={S.memberHeader}>
                        <div style={S.avatar(AVATAR_COLORS[mi % AVATAR_COLORS.length])}>
                          {getName(m).charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize:'0.7rem', whiteSpace:'nowrap',
                          overflow:'hidden', textOverflow:'ellipsis', maxWidth:'56px' }}>
                          {getName(m).split(' ')[0]}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th style={{ ...S.th, textAlign:'center', minWidth:'48px' }}>All</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const checkedCount = memberIds.filter(uid => item.assignedTo[uid]).length;
                  const allChecked   = checkedCount === memberIds.length;
                  return (
                    <tr
                      key={item.id}
                      className="ss-row"
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <td style={S.td}>
                        <div style={{ fontWeight:'500', color:'#fff', fontSize:'0.87rem' }}>
                          {item.name}
                        </div>
                        {item.quantity && (
                          <div style={{ fontSize:'0.74rem', color:'var(--text-dim)' }}>
                            ×{item.quantity}
                            {item.unitPrice ? ` @ ${fmt(item.unitPrice, currency)}` : ''}
                          </div>
                        )}
                        {checkedCount > 1 && (
                          <div style={{
                            display:'inline-block', marginTop:'0.25rem',
                            fontSize:'0.7rem', padding:'0.1rem 0.45rem',
                            background:'rgba(99,102,241,0.15)',
                            border:'1px solid rgba(99,102,241,0.3)',
                            borderRadius:'999px', color:'var(--primary)',
                          }}>
                            shared ÷ {checkedCount}
                          </div>
                        )}
                      </td>
                      <td style={{ ...S.td, ...S.tdRight, fontWeight:'600', color:'var(--accent-emerald)' }}>
                        {fmt(item.totalPrice, currency)}
                      </td>
                      {/* Task 6.2: checkboxes per member */}
                      {members.map(m => {
                        const uid     = getId(m);
                        const checked = item.assignedTo[uid];
                        return (
                          <td key={uid} style={{ ...S.td, textAlign:'center' }}>
                            <div
                              className="ss-cb"
                              style={{ ...S.checkbox(checked), margin:'0 auto' }}
                              onClick={() => toggleAssignment(item.id, uid)}
                              title={`${checked ? 'Remove' : 'Add'} ${getName(m)}`}
                            >
                              {checked ? '✓' : ''}
                            </div>
                          </td>
                        );
                      })}
                      {/* Select All / None toggle */}
                      <td style={{ ...S.td, textAlign:'center' }}>
                        <div
                          className="ss-cb"
                          style={{ ...S.checkbox(allChecked), margin:'0 auto',
                            background: allChecked ? 'rgba(6,182,212,0.7)' : undefined,
                            borderColor: allChecked ? '#06b6d4' : undefined,
                            fontSize:'0.62rem',
                          }}
                          onClick={() => selectAllForItem(item.id, !allChecked)}
                          title={allChecked ? 'Deselect all' : 'Select all'}
                        >
                          {allChecked ? '✓' : '＋'}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={members.length + 3} style={{ ...S.td, textAlign:'center',
                      color:'var(--text-dim)', padding:'1.5rem', fontStyle:'italic' }}>
                      No line items available. Use equal split instead.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Task 6.3: Per-member summary + Task 6.6: Manual override ── */}
          <p style={{ ...S.sectionTitle, marginBottom:'0.6rem' }}>💰 Member Shares</p>
          <div style={S.summaryGrid}>
            {members.map((m, mi) => {
              const uid          = getId(m);
              const name         = getName(m);
              const suggestedAmt = suggested[uid] || 0;
              const effectiveAmt = effective[uid]  || 0;
              const isOverridden = overrides[uid] !== undefined && overrides[uid] !== '';
              const diff         = p2(effectiveAmt - suggestedAmt);

              return (
                <div key={uid} style={S.summaryCard(isOverridden)}>
                  {/* Member avatar + name */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem' }}>
                    <div style={S.avatar(AVATAR_COLORS[mi % AVATAR_COLORS.length])}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight:'600', fontSize:'0.88rem' }}>
                      {name.split(' ')[0]}
                      {uid === paidBy && (
                        <span style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginLeft:'0.3rem' }}>(paid)</span>
                      )}
                    </span>
                  </div>

                  {/* Suggested amount */}
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.15rem' }}>
                    Suggested: <strong style={{ color:'#fff' }}>{fmt(suggestedAmt, currency)}</strong>
                  </div>

                  {/* Task 6.6: Manual override input */}
                  <input
                    className="ss-oi"
                    style={{
                      ...S.overrideInput,
                      borderColor: isOverridden ? 'rgba(245,158,11,0.5)' : undefined,
                    }}
                    type="number"
                    min="0" step="0.01"
                    placeholder={p2(suggestedAmt).toFixed(2)}
                    value={isOverridden ? overrides[uid] : ''}
                    onChange={e => handleOverride(uid, e.target.value)}
                  />

                  {/* Diff indicator */}
                  {isOverridden && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.3rem' }}>
                      <span style={{ fontSize:'0.72rem', color: diff > 0 ? 'var(--accent-amber)' : diff < 0 ? 'var(--accent-rose)' : 'var(--text-dim)' }}>
                        {diff > 0 ? `+${fmt(diff, '')}` : diff < 0 ? fmt(diff, '') : '='}
                      </span>
                      <button
                        style={{ background:'none', border:'none', color:'var(--text-dim)',
                          fontSize:'0.72rem', cursor:'pointer', padding:0 }}
                        onClick={() => resetOverride(uid)}
                      >
                        ↺ reset
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Balance check ── */}
          {!isBalanced && (
            <div style={S.warningBox}>
              ⚠️ Total of overridden amounts ({fmt(effectiveTotal, currency)}) differs from grand total
              ({fmt(totalAmount, currency)}) by {fmt(totalDiff, currency)}.
              Please adjust overrides to balance, or reset them.
            </div>
          )}

          {isBalanced && items.length > 0 && (
            <div style={{
              background:'rgba(16,185,129,0.08)',
              border:'1px solid rgba(16,185,129,0.2)',
              borderRadius:'8px', padding:'0.6rem 0.9rem',
              color:'var(--accent-emerald)', fontSize:'0.82rem',
              marginBottom:'0.5rem',
            }}>
              ✅ Split balances to {fmt(totalAmount, currency)} — ready to confirm.
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={S.footer}>
          <button style={S.btnSecondary} className="ss-btn-s" onClick={onClose}>
            Cancel
          </button>
          <button
            id="smart-split-confirm-btn"
            style={{ ...S.btnPrimary, opacity: !isBalanced ? 0.55 : 1, cursor: !isBalanced ? 'not-allowed' : 'pointer' }}
            className="ss-btn-p"
            onClick={handleConfirm}
            disabled={!isBalanced}
            title={!isBalanced ? 'Adjust amounts to balance the total first' : undefined}
          >
            ✅ Use This Split
          </button>
        </div>
      </div>
    </div>
  );
}
