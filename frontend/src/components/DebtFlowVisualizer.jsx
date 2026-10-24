import React, { useState, useMemo } from 'react';
import {
    FaArrowRight,
    FaCheckCircle,
    FaHandHoldingUsd,
    FaInfoCircle,
    FaUser,
    FaCoins,
    FaBolt,
    FaProjectDiagram,
    FaExchangeAlt,
    FaRedo,
    FaCheck
} from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';

/**
 * 9️⃣, 🔟, 1️⃣1️⃣ Interactive Debt Flow Visualization Component
 *
 * Features:
 * - 9.1 Reusable component accepting balances, transactions, and group data
 * - 9.2 Member nodes categorized by Debtor, Creditor, or Settled with rich avatars
 * - 9.3 Directed cubic Bezier connections from Debtors to Creditors
 * - 9.4 Payment direction clearly visualized with animated glowing dashes & arrowheads
 * - 9.5 Payment amount displayed on connection midpoint pill badges
 * - 9.6 Graph generated dynamically from API response data
 * - 9.7 Gracefully handles members with no outgoing transactions (creditors and settled members)
 * - 9.8 Handles larger groups with layout toggle (Flow Stream vs Network Circle) & auto-scaling
 * - 9.9 Responsive SVG viewBox with touch & mouse interaction
 * - 10.1 Hover & Click interaction on edges, badges, and nodes
 * - 10.2 Payer details (Avatar, Name, Balance status)
 * - 10.3 Receiver details (Avatar, Name, Balance status)
 * - 10.4 Formatted payment amount with percentage share of group debt
 * - 10.5 & 10.6 Human-readable payment suggestions: "Alice should pay Bob ₹500"
 * - 10.7 Active transaction highlighting with glowing path and dimmed background
 * - 10.8 Cross-platform support (Desktop hover/click & Mobile touch)
 * - 11.1 - 11.3 Seamless settlement flow initiation reusing existing settlement API
 * - 11.6 - 11.9 Success feedback, debt clearance, and suggestion removal
 */
const DebtFlowVisualizer = ({
    balances = [],
    optimizedTransactions = [],
    groupCurrency = 'INR',
    onSettle = null,
    onRefresh = null,
    groupId = null
}) => {
    // 9.8 Layout mode: 'flow' (Bipartite Stream: Debtors -> Creditors) or 'radial' (Circular Network)
    const [layoutMode, setLayoutMode] = useState('flow');

    // 10.1 & 10.7 Active selection
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [filterMemberId, setFilterMemberId] = useState(null);

    const currencyCtx = useCurrency();
    const formatCurrency = currencyCtx?.formatCurrency || ((val, code = 'INR') => {
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(val);
        } catch {
            return `₹${Number(val || 0).toFixed(2)}`;
        }
    });
    const gc = groupCurrency || 'INR';


    // Normalize transaction list
    const transactions = useMemo(() => {
        if (!Array.isArray(optimizedTransactions)) return [];
        return optimizedTransactions.map((tx, idx) => {
            const payer = tx.fromUser || tx.from || {};
            const receiver = tx.toUser || tx.to || {};
            const payerId = (payer._id || payer.id || tx.from || '').toString();
            const receiverId = (receiver._id || receiver.id || tx.to || '').toString();
            return {
                id: idx,
                payerId,
                receiverId,
                payerName: payer.name || 'Member',
                payerEmail: payer.email || '',
                receiverName: receiver.name || 'Member',
                receiverEmail: receiver.email || '',
                amount: parseFloat(tx.amount) || 0,
                originalTx: tx
            };
        }).filter(tx => tx.amount > 0.009 && tx.payerId && tx.receiverId);
    }, [optimizedTransactions]);

    // Normalize members & balances
    const members = useMemo(() => {
        if (!Array.isArray(balances)) return [];
        return balances.map(b => {
            const uid = (b.user?._id || b.user?.id || b.user || '').toString();
            const net = parseFloat(b.netBalance !== undefined ? b.netBalance : b.balance) || 0;
            const status = net < -0.009 ? 'debtor' : net > 0.009 ? 'creditor' : 'settled';
            return {
                id: uid,
                name: b.user?.name || 'Member',
                email: b.user?.email || '',
                netBalance: Math.round(net * 100) / 100,
                totalPaid: parseFloat(b.totalPaid) || 0,
                totalOwed: parseFloat(b.totalOwed) || 0,
                status
            };
        });
    }, [balances]);

    // Active transaction being viewed / suggested
    const activeIndex = hoveredIdx !== null ? hoveredIdx : selectedIdx;
    const activeTx = transactions[activeIndex] || transactions[0] || null;

    // Total outstanding debt in the group
    const totalGroupDebt = useMemo(() => {
        return transactions.reduce((sum, tx) => sum + tx.amount, 0);
    }, [transactions]);

    // 9.8 Coordinate Layout Calculation
    const { width, height, nodePositions, edgePaths } = useMemo(() => {
        const svgWidth = 840;

        if (layoutMode === 'flow') {
            // Bipartite Stream Layout: Debtors on Left (x=160), Creditors on Right (x=680), Settled at Bottom
            const debtors = members.filter(m => m.status === 'debtor');
            const creditors = members.filter(m => m.status === 'creditor');
            const settled = members.filter(m => m.status === 'settled');

            const maxCol = Math.max(debtors.length, creditors.length, 1);
            const rowSpacing = Math.max(76, Math.min(100, 480 / maxCol));
            const startY = 80;
            const flowHeight = Math.max(380, startY + maxCol * rowSpacing + (settled.length > 0 ? 90 : 40));

            const positions = {};

            debtors.forEach((d, i) => {
                positions[d.id] = {
                    x: 160,
                    y: startY + i * rowSpacing + rowSpacing / 2,
                    data: d,
                    col: 'left'
                };
            });

            creditors.forEach((c, i) => {
                positions[c.id] = {
                    x: 680,
                    y: startY + i * rowSpacing + rowSpacing / 2,
                    data: c,
                    col: 'right'
                };
            });

            // Settled members placed cleanly along bottom horizontal rack
            if (settled.length > 0) {
                const settledY = flowHeight - 50;
                const settledSpacing = (svgWidth - 200) / (settled.length + 1);
                settled.forEach((s, i) => {
                    positions[s.id] = {
                        x: 100 + (i + 1) * settledSpacing,
                        y: settledY,
                        data: s,
                        col: 'bottom'
                    };
                });
            }

            // Calculate Bezier Paths for Transactions
            const paths = transactions.map(tx => {
                const p1 = positions[tx.payerId] || { x: 160, y: startY };
                const p2 = positions[tx.receiverId] || { x: 680, y: startY };

                const startX = p1.x + 44; // right edge of payer node
                const startYPos = p1.y;
                const endX = p2.x - 44;   // left edge of receiver node
                const endYPos = p2.y;

                // Control points for organic cubic bezier curve
                const dx = endX - startX;
                const cp1x = startX + dx * 0.45;
                const cp1y = startYPos;
                const cp2x = startX + dx * 0.55;
                const cp2y = endYPos;

                const pathData = `M ${startX} ${startYPos} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endYPos}`;

                // Midpoint for payment amount badge
                const midX = (startX + endX) / 2;
                const midY = (startYPos + endYPos) / 2;

                return {
                    tx,
                    pathData,
                    midX,
                    midY,
                    p1,
                    p2
                };
            });

            return { width: svgWidth, height: flowHeight, nodePositions: positions, edgePaths: paths };
        } else {
            // Circular / Radial Network Graph Layout
            const totalNodes = Math.max(members.length, 1);
            const radius = Math.max(140, Math.min(200, 100 + totalNodes * 14));
            const svgHeight = Math.max(480, radius * 2 + 160);
            const centerX = svgWidth / 2;
            const centerY = svgHeight / 2;

            const positions = {};
            members.forEach((m, idx) => {
                const angle = (idx / totalNodes) * 2 * Math.PI - Math.PI / 2;
                positions[m.id] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                    data: m,
                    angle
                };
            });

            // Calculate inward curved Bezier Paths
            const paths = transactions.map(tx => {
                const p1 = positions[tx.payerId] || { x: centerX, y: centerY };
                const p2 = positions[tx.receiverId] || { x: centerX, y: centerY };

                // Angle towards center to offset node radius (32px)
                const angle1 = Math.atan2(centerY - p1.y, centerX - p1.x);
                const angle2 = Math.atan2(centerY - p2.y, centerX - p2.x);

                const startX = p1.x + 32 * Math.cos(angle1);
                const startYPos = p1.y + 32 * Math.sin(angle1);
                const endX = p2.x + 32 * Math.cos(angle2);
                const endYPos = p2.y + 32 * Math.sin(angle2);

                // Curve towards center
                const cpX = centerX;
                const cpY = centerY;

                const pathData = `M ${startX} ${startYPos} Q ${cpX} ${cpY} ${endX} ${endYPos}`;

                // Midpoint along quadratic curve
                const midX = 0.25 * startX + 0.5 * cpX + 0.25 * endX;
                const midY = 0.25 * startYPos + 0.5 * cpY + 0.25 * endYPos;

                return {
                    tx,
                    pathData,
                    midX,
                    midY,
                    p1,
                    p2
                };
            });

            return { width: svgWidth, height: svgHeight, nodePositions: positions, edgePaths: paths };
        }
    }, [layoutMode, members, transactions]);

    // Handle settlement button click
    const handleSettleClick = (tx) => {
        if (!tx) return;
        if (onSettle) {
            onSettle({
                from: { _id: tx.payerId, name: tx.payerName, email: tx.payerEmail },
                to: { _id: tx.receiverId, name: tx.receiverName, email: tx.receiverEmail },
                fromUser: { _id: tx.payerId, name: tx.payerName, email: tx.payerEmail },
                toUser: { _id: tx.receiverId, name: tx.receiverName, email: tx.receiverEmail },
                amount: tx.amount,
                note: `Settling debt from graph visualization`
            });
        }
    };

    // 9.7 & 8.8 Empty State: All settled up
    if (transactions.length === 0 && members.every(m => Math.abs(m.netBalance) <= 0.009)) {
        return (
            <div className="glass-card text-center py-5 my-3 border border-success border-opacity-30"
                style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)' }}>
                <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-3 shadow-lg"
                    style={{ width: '68px', height: '68px' }}>
                    <FaCheckCircle size={36} />
                </div>
                <h4 className="fw-bold text-success mb-2" style={{ fontFamily: 'var(--font-display, sans-serif)' }}>
                    🎉 Zero Debt Flow — All Settled Up!
                </h4>
                <p className="text-muted mb-0" style={{ maxWidth: '520px', margin: '0 auto', fontSize: '0.95rem' }}>
                    All group members have fully balanced accounts. There are no outstanding payments or simplification steps required.
                </p>
            </div>
        );
    }

    return (
        <div className="debt-flow-visualizer-container animate-fade-in">
            {/* Top Toolbar: View Toggles, Filter info, and Legend */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 p-3 glass-card border border-secondary border-opacity-25"
                style={{ background: 'rgba(15, 23, 42, 0.55)' }}>
                <div className="d-flex align-items-center gap-2">
                    <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary border border-primary border-opacity-40 px-3 py-1 fw-bold">
                        <FaProjectDiagram className="me-1" /> Debt Flow Graph
                    </span>
                    <span className="text-muted small">
                        Showing <strong>{transactions.length}</strong> optimized {transactions.length === 1 ? 'payment' : 'payments'} across <strong>{members.length}</strong> members
                    </span>
                </div>

                <div className="d-flex align-items-center gap-3 flex-wrap">
                    {/* 9.8 Layout Toggle: Flow Stream vs Circular Network */}
                    <div className="btn-group btn-group-sm p-1 rounded-pill bg-black bg-opacity-40 border border-secondary border-opacity-30" role="group">
                        <button
                            type="button"
                            className={`btn rounded-pill px-3 py-1 btn-sm fw-semibold ${layoutMode === 'flow' ? 'btn-primary text-white shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                            onClick={() => setLayoutMode('flow')}
                        >
                            Flow Stream
                        </button>
                        <button
                            type="button"
                            className={`btn rounded-pill px-3 py-1 btn-sm fw-semibold ${layoutMode === 'radial' ? 'btn-primary text-white shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                            onClick={() => setLayoutMode('radial')}
                        >
                            Circular Network
                        </button>
                    </div>

                    {/* Reset member filter button if active */}
                    {filterMemberId && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm rounded-pill px-2 py-1 text-light small d-flex align-items-center gap-1"
                            onClick={() => setFilterMemberId(null)}
                        >
                            <FaRedo size={10} /> Clear Filter
                        </button>
                    )}
                </div>
            </div>

            {/* Legend Bar */}
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-4 mb-3 text-muted small py-1">
                <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle d-inline-block" style={{ width: '12px', height: '12px', background: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
                    <span>Debtor (Needs to Pay)</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle d-inline-block" style={{ width: '12px', height: '12px', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                    <span>Creditor (Gets Back)</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle d-inline-block" style={{ width: '12px', height: '12px', background: '#64748b' }} />
                    <span>Settled Member</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span style={{ width: '22px', height: '2px', background: 'linear-gradient(90deg, #f43f5e, #10b981)', display: 'inline-block' }} />
                    <FaArrowRight size={10} className="text-primary" />
                    <span>Payment Flow</span>
                </div>
            </div>

            {/* 9.1 - 9.9 SVG Canvas for Graph Visualization */}
            <div className="glass-card p-0 overflow-hidden mb-4 border border-secondary border-opacity-30 position-relative shadow-lg"
                style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.08) 0%, rgba(11, 15, 25, 0.95) 100%)' }}>

                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-100"
                    style={{ minHeight: `${height}px`, display: 'block' }}
                >
                    <defs>
                        {/* 9.4 Arrow Marker definition pointing to receiver */}
                        <marker
                            id="arrow-default"
                            viewBox="0 0 10 10"
                            refX="6"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 1 L 9 5 L 0 9 z" fill="#6366f1" />
                        </marker>

                        <marker
                            id="arrow-active"
                            viewBox="0 0 10 10"
                            refX="7"
                            refY="5"
                            markerWidth="8"
                            markerHeight="8"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill="#06b6d4" />
                        </marker>

                        {/* Glow Filter for Active Edges */}
                        <filter id="edge-glow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.8" />
                            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.5" />
                        </filter>

                        {/* Node Gradient Defs */}
                        <linearGradient id="grad-debtor" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#be123c" />
                        </linearGradient>

                        <linearGradient id="grad-creditor" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#047857" />
                        </linearGradient>

                        <linearGradient id="grad-settled" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                    </defs>

                    {/* CSS Animation for Money Flow Dash effect */}
                    <style>{`
                        @keyframes flowDash {
                            from { stroke-dashoffset: 24; }
                            to { stroke-dashoffset: 0; }
                        }
                        .payment-path-animated {
                            animation: flowDash 1.2s linear infinite;
                        }
                        .node-group {
                            transition: transform 0.2s ease, opacity 0.2s ease;
                        }
                        .node-group:hover {
                            cursor: pointer;
                        }
                        .tx-edge-group {
                            cursor: pointer;
                            transition: all 0.2s ease;
                        }
                    `}</style>

                    {/* Column Headers in Flow Mode */}
                    {layoutMode === 'flow' && (
                        <g className="column-headers" style={{ userSelect: 'none' }}>
                            <text x="160" y="38" textAnchor="middle" fill="#f43f5e" fontSize="13" fontWeight="700" letterSpacing="0.05em">
                                🔻 DEBTORS (PAYERS)
                            </text>
                            <text x="680" y="38" textAnchor="middle" fill="#10b981" fontSize="13" fontWeight="700" letterSpacing="0.05em">
                                🔺 CREDITORS (RECIPIENTS)
                            </text>
                            {members.some(m => m.status === 'settled') && (
                                <text x="420" y={height - 75} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600">
                                    ✓ SETTLED MEMBERS
                                </text>
                            )}
                        </g>
                    )}

                    {/* 9.3 & 9.4 Render Directed Connections (Edges) */}
                    <g className="edges-layer">
                        {edgePaths.map(({ tx, pathData, midX, midY }, idx) => {
                            const isSelected = activeIndex === idx;
                            const isFilteredOut = filterMemberId && tx.payerId !== filterMemberId && tx.receiverId !== filterMemberId;
                            const edgeOpacity = isFilteredOut ? 0.1 : (isSelected ? 1 : 0.45);

                            return (
                                <g
                                    key={idx}
                                    className="tx-edge-group"
                                    opacity={edgeOpacity}
                                    onMouseEnter={() => setHoveredIdx(idx)}
                                    onMouseLeave={() => setHoveredIdx(null)}
                                    onClick={() => setSelectedIdx(idx)}
                                    onTouchStart={() => setSelectedIdx(idx)}
                                >
                                    {/* Transparent fat hit-area path for effortless hover/touch */}
                                    <path
                                        d={pathData}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth="24"
                                    />

                                    {/* Base ambient stroke */}
                                    <path
                                        d={pathData}
                                        fill="none"
                                        stroke={isSelected ? '#06b6d4' : '#6366f1'}
                                        strokeWidth={isSelected ? '4' : '2'}
                                        filter={isSelected ? 'url(#edge-glow)' : undefined}
                                        markerEnd={isSelected ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                                    />

                                    {/* 9.4 Animated glowing dash path showing flow direction */}
                                    <path
                                        d={pathData}
                                        fill="none"
                                        stroke={isSelected ? '#ffffff' : '#38bdf8'}
                                        strokeWidth={isSelected ? '2.5' : '1.5'}
                                        strokeDasharray="6,8"
                                        className="payment-path-animated"
                                        opacity={isSelected ? 1 : 0.65}
                                    />

                                    {/* 9.5 Midpoint Payment Amount Pill Badge */}
                                    <g
                                        transform={`translate(${midX}, ${midY})`}
                                        style={{ transition: 'transform 0.2s ease' }}
                                    >
                                        <rect
                                            x="-46"
                                            y="-14"
                                            width="92"
                                            height="28"
                                            rx="14"
                                            fill={isSelected ? '#0f172a' : '#1e293b'}
                                            stroke={isSelected ? '#06b6d4' : 'rgba(99, 102, 241, 0.4)'}
                                            strokeWidth={isSelected ? '2' : '1'}
                                            filter={isSelected ? 'url(#edge-glow)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'}
                                        />
                                        <text
                                            x="0"
                                            y="4"
                                            textAnchor="middle"
                                            fill={isSelected ? '#38bdf8' : '#f8fafc'}
                                            fontSize="11"
                                            fontWeight="700"
                                            fontFamily="var(--font-display, sans-serif)"
                                        >
                                            {formatCurrency(tx.amount, gc)}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}
                    </g>

                    {/* 9.2 Render Member Nodes */}
                    <g className="nodes-layer">
                        {Object.entries(nodePositions).map(([uid, pos]) => {
                            const { x, y, data } = pos;
                            const isFiltered = filterMemberId === uid;
                            const isDimmed = filterMemberId && !isFiltered;

                            const isPayerOfActive = activeTx && activeTx.payerId === uid;
                            const isReceiverOfActive = activeTx && activeTx.receiverId === uid;
                            const isHighlighted = isPayerOfActive || isReceiverOfActive || isFiltered;

                            let nodeGradient = 'url(#grad-settled)';
                            let badgeBg = '#334155';
                            let badgeText = 'Settled';
                            let ringColor = 'rgba(255, 255, 255, 0.15)';

                            if (data.status === 'debtor') {
                                nodeGradient = 'url(#grad-debtor)';
                                badgeBg = 'rgba(244, 63, 94, 0.25)';
                                badgeText = `Owes ${formatCurrency(Math.abs(data.netBalance), gc)}`;
                                ringColor = isHighlighted ? '#f43f5e' : 'rgba(244, 63, 94, 0.4)';
                            } else if (data.status === 'creditor') {
                                nodeGradient = 'url(#grad-creditor)';
                                badgeBg = 'rgba(16, 185, 129, 0.25)';
                                badgeText = `Gets ${formatCurrency(data.netBalance, gc)}`;
                                ringColor = isHighlighted ? '#10b981' : 'rgba(16, 185, 129, 0.4)';
                            }

                            return (
                                <g
                                    key={uid}
                                    className="node-group"
                                    transform={`translate(${x}, ${y})`}
                                    opacity={isDimmed ? 0.25 : 1}
                                    onClick={() => setFilterMemberId(filterMemberId === uid ? null : uid)}
                                >
                                    {/* Pulsing selection halo if part of active transaction */}
                                    {isHighlighted && (
                                        <circle
                                            r="36"
                                            fill="none"
                                            stroke={isPayerOfActive ? '#f43f5e' : '#10b981'}
                                            strokeWidth="2"
                                            strokeDasharray="4,4"
                                            opacity="0.8"
                                            className="payment-path-animated"
                                        />
                                    )}

                                    {/* Outer Border Ring */}
                                    <circle
                                        r="28"
                                        fill="#0b0f19"
                                        stroke={ringColor}
                                        strokeWidth={isHighlighted ? '3' : '1.5'}
                                    />

                                    {/* Avatar Core */}
                                    <circle
                                        r="24"
                                        fill={nodeGradient}
                                    />

                                    {/* Member Initial */}
                                    <text
                                        x="0"
                                        y="6"
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        fontSize="15"
                                        fontWeight="700"
                                        fontFamily="var(--font-display, sans-serif)"
                                        pointerEvents="none"
                                    >
                                        {(data.name || '?').charAt(0).toUpperCase()}
                                    </text>

                                    {/* Member Name Label */}
                                    <text
                                        x="0"
                                        y="-34"
                                        textAnchor="middle"
                                        fill="#f8fafc"
                                        fontSize="12"
                                        fontWeight="600"
                                        pointerEvents="none"
                                    >
                                        {data.name.length > 14 ? data.name.substring(0, 12) + '…' : data.name}
                                    </text>

                                    {/* Status Pill Badge below Node */}
                                    <g transform="translate(0, 36)" pointerEvents="none">
                                        <rect
                                            x="-46"
                                            y="0"
                                            width="92"
                                            height="18"
                                            rx="9"
                                            fill="#0b0f19"
                                            stroke={ringColor}
                                            strokeWidth="1"
                                        />
                                        <text
                                            x="0"
                                            y="13"
                                            textAnchor="middle"
                                            fill={data.status === 'debtor' ? '#f43f5e' : data.status === 'creditor' ? '#10b981' : '#94a3b8'}
                                            fontSize="9.5"
                                            fontWeight="700"
                                        >
                                            {badgeText}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            {/* 🔟 INTERACTIVE PAYMENT SUGGESTIONS & SETTLEMENT ACTION CARD */}
            {activeTx && (
                <div
                    className="glass-card border border-primary border-opacity-30 p-4 position-relative overflow-hidden shadow-lg animate-fade-in"
                    style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
                    }}
                >
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom border-secondary border-opacity-25">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge rounded-pill bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-1 fw-bold">
                                💡 Payment Suggestion ({activeIndex + 1} of {transactions.length})
                            </span>
                            {totalGroupDebt > 0 && (
                                <span className="badge bg-secondary bg-opacity-25 text-muted px-2 py-1">
                                    Settles {Math.round((activeTx.amount / totalGroupDebt) * 100)}% of Group Debt
                                </span>
                            )}
                        </div>

                        {/* Pagination pills for quick switching */}
                        <div className="d-flex align-items-center gap-1">
                            {transactions.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedIdx(i)}
                                    className={`btn btn-sm p-0 rounded-circle ${selectedIdx === i ? 'bg-primary' : 'bg-secondary bg-opacity-40'}`}
                                    style={{ width: '10px', height: '10px', transition: 'all 0.2s ease' }}
                                    title={`Suggestion ${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 10.5 & 10.6 Human-Readable Suggestion Headline */}
                    <div className="mb-4">
                        <h4 className="fw-bold mb-1 text-light" style={{ fontFamily: 'var(--font-display, sans-serif)' }}>
                            <span className="text-danger">{activeTx.payerName}</span>
                            {' '}should pay{' '}
                            <span className="text-success">{activeTx.receiverName}</span>
                            {' '}
                            <span className="text-info">{formatCurrency(activeTx.amount, gc)}</span>
                        </h4>
                        <p className="text-muted small mb-0">
                            Fulfills greedy cash-flow optimization: settles <strong>{activeTx.receiverName}</strong>’s claim and eliminates cross-debt without passing through intermediaries.
                        </p>
                    </div>

                    {/* 10.2 & 10.3 Payer vs Receiver Cards */}
                    <div className="row g-3 mb-4">
                        {/* 10.2 Payer Information */}
                        <div className="col-12 col-md-5">
                            <div className="p-3 rounded-3 bg-black bg-opacity-30 border border-danger border-opacity-25 h-100">
                                <div className="text-uppercase text-danger fw-bold small mb-2 d-flex align-items-center gap-1">
                                    <FaUser size={12} /> Payer (Debtor)
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold fs-5 shadow"
                                        style={{ width: '44px', height: '44px' }}>
                                        {activeTx.payerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="fw-bold text-light">{activeTx.payerName}</div>
                                        {activeTx.payerEmail && <div className="text-muted small">{activeTx.payerEmail}</div>}
                                        <div className="text-danger small fw-semibold mt-1">
                                            Status: Owes money to the group
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mid Flow Connector */}
                        <div className="col-12 col-md-2 d-flex flex-column align-items-center justify-content-center text-center py-2">
                            <div className="fs-3 fw-bold text-primary mb-1">
                                {formatCurrency(activeTx.amount, gc)}
                            </div>
                            <div className="d-flex align-items-center gap-2 text-primary w-100 justify-content-center">
                                <div style={{ height: '2px', width: '30px', background: 'var(--primary)' }} />
                                <FaArrowRight />
                                <div style={{ height: '2px', width: '30px', background: 'var(--primary)' }} />
                            </div>
                            <span className="text-muted small mt-1">Direct Transfer</span>
                        </div>

                        {/* 10.3 Receiver Information */}
                        <div className="col-12 col-md-5">
                            <div className="p-3 rounded-3 bg-black bg-opacity-30 border border-success border-opacity-25 h-100">
                                <div className="text-uppercase text-success fw-bold small mb-2 d-flex align-items-center gap-1">
                                    <FaUser size={12} /> Recipient (Creditor)
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold fs-5 shadow"
                                        style={{ width: '44px', height: '44px' }}>
                                        {activeTx.receiverName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="fw-bold text-light">{activeTx.receiverName}</div>
                                        {activeTx.receiverEmail && <div className="text-muted small">{activeTx.receiverEmail}</div>}
                                        <div className="text-success small fw-semibold mt-1">
                                            Status: Gets back money from the group
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 11.1 & 11.2 Initiate Settlement Button */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-3 border-top border-secondary border-opacity-25">
                        <div className="text-muted small">
                            Tip: Clicking <strong>Settle This Payment</strong> opens the pre-filled settlement window.
                        </div>

                        <div className="d-flex gap-2">
                            {onSettle && (
                                <button
                                    type="button"
                                    className="btn btn-primary fw-bold px-4 py-2 shadow d-flex align-items-center gap-2 rounded-pill"
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                                        border: 'none'
                                    }}
                                    onClick={() => handleSettleClick(activeTx)}
                                >
                                    <FaHandHoldingUsd size={16} /> Settle This Payment ({formatCurrency(activeTx.amount, gc)})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtFlowVisualizer;
