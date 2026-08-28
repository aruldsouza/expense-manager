import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ScanReceiptModal from './ScanReceiptModal';
import CreateExpenseFromReceiptModal from './CreateExpenseFromReceiptModal';
import ReceiptDetailDrawer from './ReceiptDetailDrawer';

export default function GroupDetail({ group, currentUser, onBack }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(`active_tab_${group._id || group.id}`) || 'overview';
  });

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    localStorage.setItem(`active_tab_${group._id || group.id}`, tab);
  };
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [optimized, setOptimized] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState(currentUser ? (currentUser._id || currentUser.id) : (group.members[0] ? (group.members[0]._id || group.members[0].id) : ''));
  const [expCategory, setExpCategory] = useState('General');
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'unequal' | 'percentage'
  const [customSplits, setCustomSplits] = useState({});

  // Settle Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Invite Member Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(group);

  // Scan Receipt Modal State (Task 4.1)
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedReceiptData, setScannedReceiptData] = useState(null);

  // Create Expense from Receipt Modal State (Task 5.1)
  const [showReceiptExpenseModal, setShowReceiptExpenseModal] = useState(false);

  // Receipt Detail Drawer State (Task 7.3 / 7.4)
  const [selectedReceiptExpense, setSelectedReceiptExpense] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const loadGroupData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [expData, balData, optData, txData, grpData] = await Promise.all([
        api.getExpenses(group._id),
        api.getBalances(group._id),
        api.getOptimizedSettlements(group._id),
        api.getTransactions(group._id),
        api.getGroupDetails(group._id).catch(() => group)
      ]);
      setExpenses(expData || []);
      setBalances(balData || []);
      setOptimized(optData.optimizedTransactions || []);
      setTransactions(txData || []);
      if (grpData) setCurrentGroup(grpData);
    } catch (err) {
      console.error('Error loading group data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);


  // Initialize custom splits state when group members or total amount changes
  useEffect(() => {
    if (group.members) {
      const initial = {};
      const numMembers = group.members.length;
      const numAmount = parseFloat(expAmount) || 0;
      const perShare = numMembers > 0 ? Math.round((numAmount / numMembers) * 100) / 100 : 0;
      const perPct = numMembers > 0 ? Math.round((100 / numMembers) * 10) / 10 : 0;

      group.members.forEach(m => {
        const id = m._id || m.id;
        initial[id] = {
          selected: true,
          amount: perShare,
          percentage: perPct
        };
      });
      setCustomSplits(initial);
    }
  }, [group.members, expAmount]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount || parseFloat(expAmount) <= 0) {
      showNotification('Please enter a valid title and positive amount', 'error');
      return;
    }

    const numAmount = parseFloat(expAmount);

    let splitsPayload = [];
    if (splitType === 'equal') {
      const selectedMembers = group.members.filter(m => customSplits[m._id || m.id]?.selected !== false);
      const perShare = Math.round((numAmount / selectedMembers.length) * 100) / 100;
      splitsPayload = selectedMembers.map(m => ({
        user: m._id || m.id,
        amount: perShare,
        percentage: Math.round((100 / selectedMembers.length) * 10) / 10
      }));
    } else if (splitType === 'unequal') {
      const totalCustomSum = group.members.reduce((acc, m) => {
        const val = parseFloat(customSplits[m._id || m.id]?.amount) || 0;
        return acc + val;
      }, 0);

      if (Math.abs(totalCustomSum - numAmount) > 0.05) {
        showNotification(`Sum of split amounts (₹${totalCustomSum.toFixed(2)}) must equal total expense amount (₹${numAmount.toFixed(2)})`, 'error');
        return;
      }

      splitsPayload = group.members.map(m => ({
        user: m._id || m.id,
        amount: parseFloat(customSplits[m._id || m.id]?.amount) || 0,
        percentage: Math.round(((parseFloat(customSplits[m._id || m.id]?.amount) || 0) / numAmount) * 10000) / 100
      }));
    } else if (splitType === 'percentage') {
      const totalPct = group.members.reduce((acc, m) => {
        const val = parseFloat(customSplits[m._id || m.id]?.percentage) || 0;
        return acc + val;
      }, 0);

      if (Math.abs(totalPct - 100) > 0.1) {
        showNotification(`Total percentage (${totalPct.toFixed(1)}%) must equal 100%`, 'error');
        return;
      }

      splitsPayload = group.members.map(m => {
        const pct = parseFloat(customSplits[m._id || m.id]?.percentage) || 0;
        return {
          user: m._id || m.id,
          amount: Math.round((numAmount * (pct / 100)) * 100) / 100,
          percentage: pct
        };
      });
    }

    try {
      setShowExpenseModal(false);
      setExpTitle('');
      setExpAmount('');
      await api.addExpense(group._id, {
        title: expTitle,
        amount: numAmount,
        paidBy: expPaidBy,
        category: expCategory,
        splitType,
        splits: splitsPayload
      });
      loadGroupData(true);
      showNotification('Expense added successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to add expense', 'error');
    }
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    if (!settleFrom || !settleTo || !settleAmount || parseFloat(settleAmount) <= 0) {
      showNotification('Please select both payer and recipient, and enter a valid positive settlement amount.', 'error');
      return;
    }

    if (settleFrom.toString() === settleTo.toString()) {
      showNotification('Payer and Recipient must be different members.', 'error');
      return;
    }

    try {
      setShowSettleModal(false);
      const amt = settleAmount;
      setSettleFrom('');
      setSettleTo('');
      setSettleAmount('');
      setSettleNotes('');
      await api.recordSettlement(group._id, {
        fromUser: settleFrom,
        toUser: settleTo,
        amount: parseFloat(amt),
        notes: settleNotes
      });
      loadGroupData(true);
      showNotification('Settlement payment recorded successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to record settlement', 'error');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.trim()) return;
    setInviting(true);
    const emailToInvite = inviteEmail.trim();
    try {
      setInviteEmail('');
      await api.addMember(group._id, emailToInvite);
      loadGroupData(true);
      showNotification(`"${emailToInvite}" added to the group!`);
    } catch (err) {
      showNotification(err.message || 'Failed to invite member', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove "${memberName || 'this member'}" from "${currentGroup.name}"?`)) {
      return;
    }
    setRemovingMemberId(memberId);
    try {
      await api.removeMember(group._id, memberId);
      loadGroupData(true);
      showNotification(`"${memberName || 'Member'}" removed from group`);
    } catch (err) {
      showNotification(err.message || 'Failed to remove member', 'error');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const quickSettle = (opt) => {
    setSettleFrom(opt.fromUser._id || opt.fromUser.id);
    setSettleTo(opt.toUser._id || opt.toUser.id);
    setSettleAmount(opt.amount.toString());
    setSettleNotes(`Optimized settlement payout`);
    setShowSettleModal(true);
  };

  const totalSpent = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const userBalObj = balances.find(b => (b.user._id || b.user.id) === (currentUser ? (currentUser._id || currentUser.id) : null));
  const userNetPosition = userBalObj ? userBalObj.netBalance : 0;

  const currentUserId = (currentUser?._id || currentUser?.id || '').toString();
  const creatorId = (typeof currentGroup.createdBy === 'object' ? (currentGroup.createdBy?._id || currentGroup.createdBy?.id) : currentGroup.createdBy || '').toString();
  const isCreator = currentUserId === creatorId;

  const [deletingGroup, setDeletingGroup] = useState(false);

  const handleDeleteGroup = async () => {
    const grpTitle = currentGroup.name || group.name || 'this group';
    if (!window.confirm(`⚠️ Are you sure you want to permanently delete "${grpTitle}"?\n\nAll recorded expenses, balances, and settlements for this group will be deleted. This cannot be undone.`)) {
      return;
    }
    setDeletingGroup(true);
    try {
      await api.deleteGroup(group._id || group.id);
      showNotification('Group deleted successfully');
      if (onBack) onBack();
    } catch (err) {
      showNotification(err.message || 'Failed to delete group', 'error');
      setDeletingGroup(false);
    }
  };

  return (
    <div>
      {/* Instant Action Feedback Notification Banner */}
      {actionFeedback && (
        <div style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          padding: '0.85rem 1.4rem',
          borderRadius: '12px',
          background: actionFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          fontWeight: '600',
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>{actionFeedback.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{actionFeedback.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', color: 'var(--primary)', fontWeight: '600', marginBottom: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            ← Back to Groups
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '700' }}>{currentGroup.name || group.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{currentGroup.description || group.description}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setShowInviteModal(true)}>
            👥 Members ({currentGroup.members?.length || 0})
          </button>
          <button className="btn btn-secondary" onClick={() => setShowSettleModal(true)}>
            💵 Settle Up
          </button>
          {/* Task 4.1 — Scan Receipt button */}
          <button
            id="scan-receipt-trigger"
            className="btn btn-secondary"
            onClick={() => setShowScanModal(true)}
            style={{
              background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(6,182,212,0.1))',
              border: '1px solid rgba(99,102,241,0.35)',
              color: 'var(--accent-cyan)',
            }}
          >
            📷 Scan Receipt
          </button>
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
            + Add Expense
          </button>

          {/* Delete Group Button for Creator */}
          {isCreator && (
            <button
              id="delete-group-btn"
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                color: 'var(--accent-rose)',
                padding: '0.55rem 0.95rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Permanently delete group"
            >
              {deletingGroup ? 'Deleting...' : '🗑️ Delete Group'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card stat-card">
          <span className="stat-label">Total Group Expense</span>
          <span className="stat-value" style={{ color: '#fff' }}>₹{totalSpent.toFixed(2)}</span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-label">Your Net Balance</span>
          <span className="stat-value" style={{ color: userNetPosition > 0 ? 'var(--accent-emerald)' : userNetPosition < 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
            {userNetPosition > 0 ? `+₹${userNetPosition.toFixed(2)}` : userNetPosition < 0 ? `-₹${Math.abs(userNetPosition).toFixed(2)}` : '₹0.00'}
          </span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-label">Optimized Transactions</span>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {optimized.length} <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>payments needed</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabSwitch('overview')}>
          Balances & Optimization
        </button>
        <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => handleTabSwitch('transactions')}>
          Transaction History ({transactions.length})
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>Loading group metrics...</div>
      ) : activeTab === 'overview' ? (
        <div className="grid-2">
          {/* Member Net Balances */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>Member Net Balances</h3>
              <span className="badge badge-cyan">{(currentGroup.members || group.members || []).length} Members</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {balances.map(b => {
                const isPositive = b.netBalance > 0.01;
                const isNegative = b.netBalance < -0.01;
                return (
                  <div key={b.user._id || b.user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}>
                        {b.user.name ? b.user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                          {b.user.name}
                          {(b.user._id || b.user.id) === (currentUser ? (currentUser._id || currentUser.id) : null) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '0.35rem' }}>(You)</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {b.user.email ? `${b.user.email} • ` : ''}Paid ₹{b.totalPaid.toFixed(2)} • Owed ₹{b.totalOwed.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${isPositive ? 'badge-emerald' : isNegative ? 'badge-rose' : 'badge-amber'}`}>
                      {isPositive ? `gets back ₹${b.netBalance.toFixed(2)}` : isNegative ? `owes ₹${Math.abs(b.netBalance).toFixed(2)}` : 'settled up'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Greedy Optimized Settlements */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>Greedy Debt Simplification</h3>
              <span className="badge badge-cyan">Min-Cash-Flow Algorithm</span>
            </div>

            {optimized.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                🎉 Everyone is completely settled up! No debts pending.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {optimized.map((opt, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--accent-rose)' }}>{opt.fromUser.name}</span>
                      <span style={{ color: 'var(--text-dim)' }}>pays</span>
                      <span style={{ fontWeight: '600', color: 'var(--accent-emerald)' }}>{opt.toUser.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1.1rem', color: '#fff' }}>
                        ₹{opt.amount.toFixed(2)}
                      </span>
                      <button className="btn btn-primary btn-sm" onClick={() => quickSettle(opt)}>
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Transaction History Ledger */
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.25rem', fontSize: '1.15rem' }}>Transaction Ledger</h3>
          {transactions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No expenses or settlements logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {transactions.map(tx => {
                const isExpense = tx.type === 'expense';
                return (
                  <div key={tx._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: `4px solid ${isExpense ? (tx.receiptMeta ? 'var(--accent-cyan)' : 'var(--primary)') : 'var(--accent-emerald)'}`
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.95rem' }}>
                        <span>{isExpense ? (tx.receiptMeta ? '📷' : '🛒') : '🤝'}</span>
                        <span>{isExpense ? tx.title : `Settlement: ${tx.fromUser?.name || 'User'} paid ${tx.toUser?.name || 'User'}`}</span>
                        {/* Task 7.3 — Receipt indicator badge */}
                        {isExpense && tx.receiptMeta && (
                          <button
                            id={`receipt-badge-${tx._id}`}
                            onClick={() => setSelectedReceiptExpense(tx)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              background: 'rgba(6,182,212,0.12)',
                              border: '1px solid rgba(6,182,212,0.3)',
                              borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700',
                              color: 'var(--accent-cyan)', cursor: 'pointer',
                              transition: 'all 0.2s', flexShrink: 0,
                            }}
                            title="View extracted receipt details"
                          >
                            📄 Receipt
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        {isExpense ? `Paid by ${tx.paidBy?.name || 'Member'} • ${tx.category || 'General'}` : (tx.notes || 'No notes')}
                        {tx.date && ` • ${new Date(tx.date).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', fontSize: '1.05rem', color: isExpense ? '#fff' : 'var(--accent-emerald)' }}>
                        {isExpense ? `-₹${tx.amount.toFixed(2)}` : `₹${tx.amount.toFixed(2)}`}
                      </div>
                      {isExpense && (
                        <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                          {tx.splitType || 'equal'} split
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Add Expense</h2>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', color: 'var(--text-dim)', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Task 10.1: Quick scan trigger inside manual add modal */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.65rem 0.85rem', marginBottom: '0.85rem',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                <span>✨</span>
                <span>Have a receipt photo?</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowExpenseModal(false);
                  setShowScanModal(true);
                }}
                style={{
                  background: 'rgba(99,102,241,0.2)',
                  borderColor: 'rgba(99,102,241,0.4)',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.78rem', padding: '0.3rem 0.65rem'
                }}
              >
                📷 Scan &amp; Auto-fill
              </button>
            </div>

            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Expense Title</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="e.g. Dinner, Uber, Groceries"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Total Amount (₹)</label>
                  <input
                    className="glass-input"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Paid By</label>
                  <select className="glass-input" value={expPaidBy} onChange={e => setExpPaidBy(e.target.value)} required>
                    {(currentGroup.members || group.members).map(m => (
                      <option key={m._id || m.id} value={m._id || m.id} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Category</label>
                  <select className="glass-input" value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                    <option value="Food" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>🍔 Food & Drinks</option>
                    <option value="Transportation" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>🚕 Transportation</option>
                    <option value="Accommodation" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>🏨 Accommodation</option>
                    <option value="Entertainment" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>🎟️ Entertainment</option>
                    <option value="Shopping" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>🛍️ Shopping</option>
                    <option value="General" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>📦 General</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Split Method</label>
                  <select className="glass-input" value={splitType} onChange={e => setSplitType(e.target.value)}>
                    <option value="equal" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>Equal Split (=)</option>
                    <option value="unequal" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>Exact Amount (₹)</option>
                    <option value="percentage" style={{ background: 'var(--bg-secondary)', color: '#fff' }}>Percentage (%)</option>
                  </select>
                </div>
              </div>

              {/* Custom Split Inputs */}
              {(splitType === 'unequal' || splitType === 'percentage') && (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {splitType === 'unequal' ? 'Enter exact share per member (₹):' : 'Enter percentage share per member (%):'}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(currentGroup.members || group.members).map(m => {
                      const mId = m._id || m.id;
                      const splitObj = customSplits[mId] || {};
                      return (
                        <div key={mId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.88rem' }}>{m.name}</span>
                          {splitType === 'unequal' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>₹</span>
                              <input
                                className="glass-input"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                style={{ width: '90px', padding: '0.35rem 0.5rem' }}
                                value={splitObj.amount || ''}
                                onChange={e => setCustomSplits(prev => ({
                                  ...prev,
                                  [mId]: { ...prev[mId], amount: e.target.value }
                                }))}
                              />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <input
                                className="glass-input"
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                style={{ width: '80px', padding: '0.35rem 0.5rem' }}
                                value={splitObj.percentage || ''}
                                onChange={e => setCustomSplits(prev => ({
                                  ...prev,
                                  [mId]: { ...prev[mId], percentage: e.target.value }
                                }))}
                              />
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Record Settlement</h2>
              <button onClick={() => setShowSettleModal(false)} style={{ background: 'none', color: 'var(--text-dim)', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleRecordSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Payer (Who paid?)</label>
                <select className="glass-input" value={settleFrom} onChange={e => setSettleFrom(e.target.value)} required>
                  <option value="">Select Payer...</option>
                  {(currentGroup.members || group.members).map((m, idx) => {
                    const mId = (m._id || m.id || m).toString();
                    const mName = m.name || m.email?.split('@')[0] || `Member ${idx + 1}`;
                    return (
                      <option key={mId || idx} value={mId} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                        {mName} {m.email ? `(${m.email})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Recipient (Who received?)</label>
                <select className="glass-input" value={settleTo} onChange={e => setSettleTo(e.target.value)} required>
                  <option value="">Select Recipient...</option>
                  {(currentGroup.members || group.members).map((m, idx) => {
                    const mId = (m._id || m.id || m).toString();
                    const mName = m.name || m.email?.split('@')[0] || `Member ${idx + 1}`;
                    return (
                      <option key={mId || idx} value={mId} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                        {mName} {m.email ? `(${m.email})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Settlement Amount (₹)</label>
                <input
                  className="glass-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Note (Optional)</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="e.g. Bank transfer, Cash payment"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setShowSettleModal(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members & Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="glass-card modal-content" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>👥 Group Members & Invites</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Current Members List with Remove Option */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                CURRENT MEMBERS ({currentGroup.members?.length || 0})
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                {currentGroup.members && currentGroup.members.map((m, idx) => {
                  const mId = (m._id || m.id || m).toString();
                  const isMemberCreator = mId === creatorId;
                  const isCurrentUser = mId === currentUserId;
                  const displayName = m.name || m.email?.split('@')[0] || 'Member';

                  return (
                    <div
                      key={mId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: `hsl(${(idx * 85) % 360}, 65%, 50%)`,
                          color: '#fff', fontSize: '0.82rem', fontWeight: '700',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{displayName}</span>
                            {isCurrentUser && <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>(You)</span>}
                            {isMemberCreator && <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>👑 Creator</span>}
                          </div>
                          {m.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{m.email}</div>}
                        </div>
                      </div>

                      {/* Remove Person Button */}
                      {!isMemberCreator && (isCreator || isCurrentUser) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(mId, displayName)}
                          disabled={removingMemberId === mId}
                          style={{
                            background: 'rgba(244, 63, 94, 0.12)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            color: 'var(--accent-rose)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title={isCurrentUser ? 'Leave group' : 'Remove member'}
                        >
                          {removingMemberId === mId ? 'Removing...' : (isCurrentUser ? '🚪 Leave' : '🗑️ Remove')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.2rem' }}>
              <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    INVITE NEW MEMBER BY EMAIL
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="glass-input"
                      type="email"
                      placeholder="friend@email.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      required
                    />
                    <button className="btn btn-primary" type="submit" disabled={inviting} style={{ whiteSpace: 'nowrap' }}>
                      {inviting ? 'Inviting...' : '+ Add'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'block' }}>
                    ✉️ Added members will automatically see this group in their dashboard.
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task 4 — Scan Receipt Modal */}
      {showScanModal && (
        <ScanReceiptModal
          groupCurrency={currentGroup.currency || group.currency || 'INR'}
          onClose={() => setShowScanModal(false)}
          onConfirm={(data) => {
            setScannedReceiptData(data);
            setShowScanModal(false);
            // Task 5: open the dedicated expense-creation modal instead of generic one
            setShowReceiptExpenseModal(true);
          }}
        />
      )}

      {/* Task 5 — Create Expense from Receipt Modal */}
      {showReceiptExpenseModal && scannedReceiptData && (
        <CreateExpenseFromReceiptModal
          receiptData={scannedReceiptData}
          group={currentGroup}
          currentUser={currentUser}
          onClose={() => {
            setShowReceiptExpenseModal(false);
            setScannedReceiptData(null);
          }}
          onSuccess={() => {
            setShowReceiptExpenseModal(false);
            setScannedReceiptData(null);
            loadGroupData();   // Task 5.4: refresh balances & expense list
          }}
        />
      )}

      {/* Task 7.4 — Receipt Detail Drawer */}
      {selectedReceiptExpense && (
        <ReceiptDetailDrawer
          expense={selectedReceiptExpense}
          onClose={() => setSelectedReceiptExpense(null)}
        />
      )}
    </div>
  );
}
