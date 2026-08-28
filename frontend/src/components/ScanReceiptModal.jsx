/**
 * ScanReceiptModal.jsx  — Task 4: Receipt Review UI
 *
 * Stages:
 *   'upload'  → Task 4.2 drag-and-drop / file picker + Task 4.3 image preview
 *   'loading' → Task 4.4 animated Gemini analysis state
 *   'review'  → Task 4.5 editable form + Task 4.6 corrections + Task 4.7 AI badge
 *
 * Props:
 *   onClose()             — close the modal
 *   onConfirm(data)       — called with the final (possibly edited) receipt data
 *   groupCurrency         — group default currency for placeholder display
 */

import React, { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_MB = 5;

const CATEGORIES = [
  'Food & Dining', 'Grocery', 'Shopping', 'Transportation',
  'Healthcare', 'Entertainment', 'Utilities', 'Travel',
  'Education', 'Personal Care', 'Electronics', 'Other'
];

/* ─── Inline styles (matches existing dark glassmorphic design system) ─────── */
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.82)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    width: '100%', maxWidth: '680px',
    maxHeight: '92vh', overflowY: 'auto',
    background: 'rgba(18, 24, 39, 0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.4rem 1.6rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem', fontWeight: '700', color: '#fff',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  closeBtn: {
    width: '32px', height: '32px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%', color: 'var(--text-muted)',
    fontSize: '1rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  body: { padding: '1.4rem 1.6rem', flex: 1 },
  footer: {
    padding: '1rem 1.6rem 1.4rem',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
  },
  /* Drop zone */
  dropZone: (isDragging) => ({
    border: `2px dashed ${isDragging ? 'var(--primary)' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: '16px',
    background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.5)',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    transform: isDragging ? 'scale(1.01)' : 'none',
  }),
  /* Preview image */
  previewWrap: {
    position: 'relative', borderRadius: '12px',
    overflow: 'hidden', marginBottom: '1rem',
    border: '1px solid rgba(255,255,255,0.1)',
    maxHeight: '260px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0b0f19',
  },
  previewImg: {
    maxWidth: '100%', maxHeight: '260px',
    objectFit: 'contain', display: 'block',
  },
  changeBtn: {
    position: 'absolute', top: '0.6rem', right: '0.6rem',
    background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', borderRadius: '6px', padding: '0.3rem 0.65rem',
    fontSize: '0.78rem', cursor: 'pointer',
  },
  /* AI badge */
  aiBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.35rem 0.8rem',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))',
    border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600',
    color: 'var(--accent-cyan)', marginBottom: '1rem',
  },
  aiBanner: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '10px', padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
  },
  /* Form */
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: {
    width: '100%', background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: '#fff', fontSize: '0.93rem', outline: 'none',
    fontFamily: 'var(--font-main)', transition: 'border-color 0.2s',
  },
  select: {
    width: '100%', background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: '#fff', fontSize: '0.93rem', outline: 'none',
    fontFamily: 'var(--font-main)',
  },
  sectionTitle: {
    fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginTop: '1.25rem', marginBottom: '0.65rem',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
  },
  lineItemRow: {
    display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.9fr 0.9fr auto',
    gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem',
  },
  lineItemInput: {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px', padding: '0.45rem 0.6rem',
    color: '#fff', fontSize: '0.85rem', outline: 'none',
    fontFamily: 'var(--font-main)', width: '100%',
  },
  totalsGrid: {
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '0.9rem 1rem',
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '0.7rem',
  },
  /* Buttons */
  btnPrimary: {
    background: 'linear-gradient(135deg, var(--primary), #4338ca)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.7rem 1.5rem', fontSize: '0.92rem', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-main)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', padding: '0.7rem 1.5rem',
    fontSize: '0.92rem', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  btnDanger: {
    background: 'transparent', border: 'none',
    color: 'var(--accent-rose)', fontSize: '1rem',
    cursor: 'pointer', padding: '0.2rem 0.4rem',
    borderRadius: '4px', lineHeight: 1,
  },
  btnAdd: {
    background: 'rgba(99,102,241,0.12)',
    border: '1px dashed rgba(99,102,241,0.4)',
    color: 'var(--primary)', borderRadius: '6px',
    padding: '0.45rem 0.75rem', fontSize: '0.82rem',
    fontWeight: '600', cursor: 'pointer', marginTop: '0.3rem',
    width: '100%', transition: 'all 0.2s',
  },
  /* Loading */
  loadingWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '1.5rem',
    padding: '3rem 1rem', textAlign: 'center',
  },
  spinner: {
    width: '60px', height: '60px',
    borderRadius: '50%',
    border: '3px solid rgba(99,102,241,0.2)',
    borderTop: '3px solid var(--primary)',
    animation: 'spin 0.9s linear infinite',
  },
  errorBox: {
    background: 'rgba(244,63,94,0.1)',
    border: '1px solid rgba(244,63,94,0.3)',
    borderRadius: '8px', padding: '0.75rem 1rem',
    color: 'var(--accent-rose)', fontSize: '0.88rem',
    marginTop: '0.75rem',
  },
};

/* ─── Helper: format number nicely ─────────────────────────────────────────── */
const fmt = (v) => (v == null ? '' : String(v));
const num = (v) => v === '' || v == null ? null : parseFloat(v) || null;

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function ScanReceiptModal({ onClose, onConfirm, groupCurrency = 'INR' }) {
  /* ── Stage: 'upload' | 'loading' | 'review' ── */
  const [stage, setStage]             = useState('upload');
  const [isDragging, setIsDragging]   = useState(false);
  const [file, setFile]               = useState(null);          // File object
  const [previewUrl, setPreviewUrl]   = useState(null);          // Local object URL
  const [uploadError, setUploadError] = useState('');

  /* ── Review form state ── */
  const [form, setForm] = useState({
    merchant: '', date: '', currency: groupCurrency,
    category: 'Other',
    subtotal: '', tax: '', discount: '', serviceCharge: '', total: '',
  });
  const [lineItems, setLineItems] = useState([]);

  const fileInputRef = useRef(null);

  /* ─── File acceptance & preview ─────────────────────────────────────────── */
  const acceptFile = useCallback((f) => {
    setUploadError('');
    if (!f) return;

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setUploadError(`Unsupported format: ${f.type}. Please upload JPG, PNG, or WEBP.`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_MB} MB.`);
      return;
    }

    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, [previewUrl]);

  /* ─── Drag & drop handlers ──────────────────────────────────────────────── */
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = '';   // allow re-selecting same file
  };

  /* ─── Trigger AI scan ───────────────────────────────────────────────────── */
  const handleScan = async () => {
    if (!file) return;
    setStage('loading');
    setUploadError('');

    try {
      const result = await api.scanReceipt(file);
      const d = result.data || {};

      // Populate the editable review form with extracted data
      setForm({
        merchant:      d.merchant      || '',
        date:          d.date          || '',
        currency:      d.currency      || groupCurrency,
        category:      d.category      || 'Other',
        subtotal:      fmt(d.subtotal),
        tax:           fmt(d.tax),
        discount:      fmt(d.discount),
        serviceCharge: fmt(d.serviceCharge),
        total:         fmt(d.total),
      });

      setLineItems(
        (d.lineItems || []).map((item, i) => ({
          id: i,
          name:       item.name       || '',
          quantity:   fmt(item.quantity),
          unitPrice:  fmt(item.unitPrice),
          totalPrice: fmt(item.totalPrice),
        }))
      );

      setStage('review');
    } catch (err) {
      setUploadError(err.message || 'Failed to scan receipt. Please try again.');
      setStage('upload');
    }
  };

  /* ─── Line item CRUD ─────────────────────────────────────────────────────── */
  const updateLineItem = (id, field, value) => {
    setLineItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };
  const removeLineItem = (id) => {
    setLineItems(prev => prev.filter(it => it.id !== id));
  };
  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: Date.now(), name: '', quantity: '', unitPrice: '', totalPrice: '' }]);
  };

  /* ─── Confirm: pass back the final (possibly edited) data ───────────────── */
  const handleConfirm = () => {
    const finalData = {
      merchant:      form.merchant      || null,
      date:          form.date          || null,
      currency:      form.currency      || groupCurrency,
      category:      form.category      || 'Other',
      subtotal:      num(form.subtotal),
      tax:           num(form.tax),
      discount:      num(form.discount),
      serviceCharge: num(form.serviceCharge),
      total:         num(form.total),
      lineItems: lineItems.map(it => ({
        name:       it.name       || 'Item',
        quantity:   num(it.quantity),
        unitPrice:  num(it.unitPrice),
        totalPrice: num(it.totalPrice),
      })),
    };
    onConfirm(finalData);
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
        @keyframes spin     { to { transform:rotate(360deg) } }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sr-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.25); }
        .sr-drop:hover { border-color: rgba(99,102,241,0.5) !important; }
        .sr-btn-primary:hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(99,102,241,0.45); }
        .sr-btn-secondary:hover { background:rgba(255,255,255,0.1) !important; }
        .sr-btn-add:hover { background:rgba(99,102,241,0.2) !important; }
        .sr-line-del:hover { background:rgba(244,63,94,0.15); }
      `}</style>

      <div style={S.modal}>
        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.title}>
            <span style={{
              width: '30px', height: '30px',
              background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
              borderRadius: '8px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0
            }}>📷</span>
            Scan Receipt
          </div>
          <button style={S.closeBtn} onClick={handleClose} className="sr-btn-secondary"
            aria-label="Close">✕</button>
        </div>

        {/* ════════════════════════════════════════════
            STAGE: UPLOAD
        ════════════════════════════════════════════ */}
        {stage === 'upload' && (
          <>
            <div style={S.body}>

              {/* Image preview (Task 4.3) */}
              {previewUrl && (
                <div style={S.previewWrap}>
                  <img src={previewUrl} alt="Receipt preview" style={S.previewImg} />
                  <button
                    style={S.changeBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title="Change image"
                  >↺ Change</button>
                </div>
              )}

              {/* Drag-and-drop zone (Task 4.2) */}
              {!previewUrl && (
                <div
                  id="receipt-drop-zone"
                  style={S.dropZone(isDragging)}
                  className="sr-drop"
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }}>📄</div>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.35rem' }}>
                    Drag & drop your receipt here
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    or click to select a file
                  </p>
                  <span style={{
                    display: 'inline-block', padding: '0.4rem 1rem',
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: '999px', fontSize: '0.78rem',
                    color: 'var(--primary)', fontWeight: '600',
                  }}>
                    JPG · PNG · WEBP &nbsp;·&nbsp; max {MAX_MB} MB
                  </span>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                style={{ display: 'none' }}
                onChange={onFileChange}
                id="receipt-file-input"
              />

              {/* File name chip */}
              {file && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginTop: '0.85rem', padding: '0.5rem 0.85rem',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '8px', fontSize: '0.85rem',
                }}>
                  <span>🖼️</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    style={{ ...S.btnDanger, fontSize: '0.85rem' }}
                    className="sr-line-del"
                    onClick={() => { setFile(null); URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                    title="Remove"
                  >✕</button>
                </div>
              )}

              {/* Error message */}
              {uploadError && <div style={S.errorBox}>⚠️ {uploadError}</div>}

              {/* Info blurb */}
              {!file && (
                <div style={{
                  marginTop: '1.25rem', padding: '0.85rem 1rem',
                  background: 'rgba(6,182,212,0.07)',
                  border: '1px solid rgba(6,182,212,0.18)',
                  borderRadius: '10px', fontSize: '0.84rem',
                  color: 'var(--text-muted)', lineHeight: '1.55',
                }}>
                  ✨ <strong style={{ color: '#fff' }}>AI-powered extraction</strong> — Gemini will automatically read your receipt and fill in merchant, date, items, taxes, and totals. You can review and correct everything before saving.
                </div>
              )}
            </div>

            <div style={S.footer}>
              <button style={S.btnSecondary} className="sr-btn-secondary" onClick={handleClose}>Cancel</button>
              <button
                id="scan-receipt-btn"
                style={{ ...S.btnPrimary, opacity: file ? 1 : 0.45, cursor: file ? 'pointer' : 'not-allowed' }}
                className="sr-btn-primary"
                disabled={!file}
                onClick={handleScan}
              >
                ✨ Analyse with Gemini AI
              </button>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════
            STAGE: LOADING  (Task 4.4)
        ════════════════════════════════════════════ */}
        {stage === 'loading' && (
          <div style={{ ...S.body, ...S.loadingWrap }}>
            {/* Animated Gemini orb */}
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(6,182,212,0.2))',
                animation: 'pulse 1.8s ease-in-out infinite',
              }} />
              <div style={{ ...S.spinner, position: 'absolute', inset: '10px' }} />
              <div style={{
                position: 'absolute', inset: '20px',
                background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', boxShadow: '0 0 20px rgba(99,102,241,0.5)',
              }}>✨</div>
            </div>

            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '0.4rem' }}>
                Gemini is reading your receipt…
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Extracting merchant, items, taxes, and totals
              </p>
            </div>

            {/* Shimmer progress bar */}
            <div style={{
              width: '220px', height: '4px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '999px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                background: 'linear-gradient(90deg,transparent,#6366f1,#06b6d4,transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s linear infinite',
              }} />
            </div>

            {previewUrl && (
              <img src={previewUrl} alt="Scanning…"
                style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'contain',
                  borderRadius: '8px', opacity: 0.55,
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
            STAGE: REVIEW  (Tasks 4.5 / 4.6 / 4.7)
        ════════════════════════════════════════════ */}
        {stage === 'review' && (
          <>
            <div style={S.body}>

              {/* Task 4.7 — AI banner */}
              <div style={S.aiBanner}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🤖</span>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '0.15rem' }}>
                    AI-extracted — please review before saving
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Gemini has filled in the details below. Check every field for accuracy and correct anything that looks wrong.
                  </p>
                </div>
              </div>

              {/* Image thumbnail */}
              {previewUrl && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <img src={previewUrl} alt="Receipt"
                    style={{ width: '72px', height: '72px', objectFit: 'cover',
                      borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                      flexShrink: 0 }} />
                  <div>
                    <div style={S.aiBadge}>✨ Gemini AI &nbsp;·&nbsp; Editable</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {file?.name} &nbsp;·&nbsp; {((file?.size || 0) / 1024).toFixed(0)} KB
                    </p>
                    <button
                      style={{ ...S.btnSecondary, padding: '0.3rem 0.7rem', fontSize: '0.78rem', marginTop: '0.3rem' }}
                      className="sr-btn-secondary"
                      onClick={() => setStage('upload')}
                    >
                      ← Try another receipt
                    </button>
                  </div>
                </div>
              )}

              {/* Task 4.5 & 4.6 — Editable review form */}

              {/* ── Row 1: Merchant + Category ── */}
              <div style={S.formGrid}>
                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="sr-merchant">🏪 Merchant</label>
                  <input
                    id="sr-merchant"
                    className="sr-input"
                    style={S.input}
                    type="text"
                    placeholder="Store or restaurant name"
                    value={form.merchant}
                    onChange={e => setForm(p => ({ ...p, merchant: e.target.value }))}
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="sr-category">🏷️ Category</label>
                  <select
                    id="sr-category"
                    className="sr-input"
                    style={S.select}
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Row 2: Date + Currency ── */}
              <div style={{ ...S.formGrid, marginTop: '0.85rem' }}>
                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="sr-date">📅 Date</label>
                  <input
                    id="sr-date"
                    className="sr-input"
                    style={S.input}
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="sr-currency">💱 Currency</label>
                  <input
                    id="sr-currency"
                    className="sr-input"
                    style={S.input}
                    type="text"
                    placeholder="e.g. INR, USD, EUR"
                    value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
                    maxLength={5}
                  />
                </div>
              </div>

              {/* ── Line Items ── */}
              <div style={S.sectionTitle}>
                <span>📦</span> Line Items
                <span style={{
                  marginLeft: 'auto', fontSize: '0.74rem',
                  color: 'var(--text-dim)', textTransform: 'none',
                  fontWeight: '400', letterSpacing: 0,
                }}>
                  {lineItems.length} item{lineItems.length !== 1 ? 's' : ''} extracted
                </span>
              </div>

              {lineItems.length > 0 && (
                <div style={{ marginBottom: '0.4rem' }}>
                  {/* Column headers */}
                  <div style={{ ...S.lineItemRow, marginBottom: '0.2rem' }}>
                    {['Item Name', 'Qty', 'Unit ₹', 'Total ₹', ''].map((h, i) => (
                      <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  {lineItems.map(item => (
                    <div key={item.id} style={S.lineItemRow}>
                      <input style={S.lineItemInput} className="sr-input" value={item.name}
                        placeholder="Item name"
                        onChange={e => updateLineItem(item.id, 'name', e.target.value)} />
                      <input style={S.lineItemInput} className="sr-input" value={item.quantity}
                        type="number" min="0" placeholder="1"
                        onChange={e => updateLineItem(item.id, 'quantity', e.target.value)} />
                      <input style={S.lineItemInput} className="sr-input" value={item.unitPrice}
                        type="number" min="0" step="0.01" placeholder="0.00"
                        onChange={e => updateLineItem(item.id, 'unitPrice', e.target.value)} />
                      <input style={S.lineItemInput} className="sr-input" value={item.totalPrice}
                        type="number" min="0" step="0.01" placeholder="0.00"
                        onChange={e => updateLineItem(item.id, 'totalPrice', e.target.value)} />
                      <button style={S.btnDanger} className="sr-line-del"
                        onClick={() => removeLineItem(item.id)} title="Remove item">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button style={S.btnAdd} className="sr-btn-add" onClick={addLineItem}>
                + Add Line Item
              </button>

              {/* ── Totals ── */}
              <div style={S.sectionTitle}><span>🧾</span> Totals & Charges</div>
              <div style={S.totalsGrid}>
                {[
                  { id: 'sr-subtotal', label: 'Subtotal', field: 'subtotal' },
                  { id: 'sr-tax',      label: 'Tax / GST / VAT', field: 'tax' },
                  { id: 'sr-discount', label: 'Discount', field: 'discount' },
                  { id: 'sr-service',  label: 'Service / Delivery Fee', field: 'serviceCharge' },
                ].map(({ id, label, field }) => (
                  <div key={field} style={S.formGroup}>
                    <label style={S.label} htmlFor={id}>{label}</label>
                    <input id={id} className="sr-input" style={S.input}
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={form[field]}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
                  </div>
                ))}

                {/* Grand Total — full width */}
                <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                  <label style={{ ...S.label, color: 'var(--accent-emerald)' }} htmlFor="sr-total">
                    ✅ Grand Total
                  </label>
                  <input
                    id="sr-total"
                    className="sr-input"
                    style={{ ...S.input, fontSize: '1.1rem', fontWeight: '700', border: '1px solid rgba(16,185,129,0.35)' }}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.total}
                    onChange={e => setForm(p => ({ ...p, total: e.target.value }))}
                  />
                </div>
              </div>

              {uploadError && <div style={S.errorBox}>⚠️ {uploadError}</div>}
            </div>

            <div style={S.footer}>
              <button style={S.btnSecondary} className="sr-btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                id="confirm-receipt-btn"
                style={S.btnPrimary}
                className="sr-btn-primary"
                onClick={handleConfirm}
              >
                ✅ Use This Receipt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
