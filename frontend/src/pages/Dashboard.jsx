import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    FaUsers, FaMoneyBillWave, FaChartPie, FaPlus,
    FaArrowRight, FaTrash, FaSun, FaMoon, FaCloudSun, FaBolt
} from 'react-icons/fa';
import StatCard from '../components/StatCard';
import { Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useCurrency } from '../context/CurrencyContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORY_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'
];

// Generates a consistent avatar color from a group name
const nameToColor = (name = '') => {
    const colors = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)',
        'linear-gradient(135deg,#ec4899,#f43f5e)',
        'linear-gradient(135deg,#10b981,#06b6d4)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
        'linear-gradient(135deg,#3b82f6,#6366f1)',
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good morning', icon: <FaSun style={{ color: '#f59e0b' }} /> };
    if (h < 17) return { text: 'Good afternoon', icon: <FaCloudSun style={{ color: '#f97316' }} /> };
    return { text: 'Good evening', icon: <FaMoon style={{ color: '#6366f1' }} /> };
};

// Animated number hook
const useCountUp = (target, duration = 1200, active = true) => {
    const [val, setVal] = useState(0);
    const rafRef = useRef(null);
    useEffect(() => {
        if (!active || typeof target !== 'number') return;
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setVal(Math.round(target * ease));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration, active]);
    return val;
};

// ─── Mini Group Card ──────────────────────────────────────────────────────────
const GroupCard = ({ group, onDelete }) => {
    const [hovered, setHovered] = useState(false);
    const initials = group.name?.slice(0, 2).toUpperCase() || '??';
    const bg = nameToColor(group.name);

    return (
        <div
            className="group-card glass-card border-0 p-0 mb-0"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="group-card-accent" />
            <div className="p-4" style={{ paddingLeft: '20px' }}>
                <div className="d-flex align-items-center gap-3">
                    {/* Avatar */}
                    <div
                        className="group-avatar"
                        style={{
                            background: bg,
                            transform: hovered ? 'rotate(8deg) scale(1.12)' : 'rotate(0deg) scale(1)',
                            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>
                            {initials}
                        </span>
                    </div>

                    {/* Info */}
                    <div className="flex-grow-1 min-width-0">
                        <div className="fw-bold text-dark mb-0 text-truncate" style={{ fontSize: '0.95rem' }}>
                            {group.name}
                        </div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '180px' }}>
                            {group.description || 'No description'}
                        </div>
                    </div>

                    {/* Member count */}
                    <Badge
                        bg="light"
                        text="dark"
                        className="rounded-pill px-3 py-2 border"
                        style={{ fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                        {group.members?.length || 1} members
                    </Badge>
                </div>

                {/* Actions – only shown on hover */}
                <div style={{
                    maxHeight: hovered ? '60px' : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                }}>
                    <div className="d-flex gap-2 pt-3 mt-1 border-top" style={{ borderColor: 'rgba(0,0,0,0.07)!important' }}>
                        <Link
                            to={`/groups/${group._id}`}
                            className="btn btn-sm btn-modern-primary rounded-pill px-3 d-flex align-items-center gap-2 text-white text-decoration-none"
                            style={{ fontSize: '0.8rem', boxShadow: 'none' }}
                        >
                            View <FaArrowRight size={10} />
                        </Link>
                        <button
                            onClick={(e) => { e.preventDefault(); onDelete(group._id); }}
                            className="btn btn-sm btn-outline-danger rounded-pill px-3"
                            style={{ fontSize: '0.8rem' }}
                        >
                            <FaTrash size={10} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useAuth();
    const { formatCurrency, displayCurrency } = useCurrency();
    const greeting = getGreeting();

    const [stats, setStats] = useState({ totalExpenses: 0, youAreOwed: 0, netBalance: 0, activeGroups: 0 });
    const [categoryData, setCategoryData] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupsError, setGroupsError] = useState('');

    const animatedGroups = useCountUp(stats.activeGroups, 900, !loading);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, groupsRes] = await Promise.all([
                    api.get('/dashboard/stats').catch(() => ({ data: {} })),
                    api.get('/groups').catch(() => ({ data: [] }))
                ]);

                if (statsRes.data?.success) {
                    setStats(statsRes.data.data);
                }

                // Handle both direct array and { success: true, data: [...] } formats
                const groupsList = Array.isArray(groupsRes.data)
                    ? groupsRes.data
                    : (groupsRes.data?.data || groupsRes.data?.groups || (Array.isArray(groupsRes) ? groupsRes : []));

                setGroups(groupsList);

                if (groupsList.length > 0) {
                    const firstGroupId = groupsList[0]._id;
                    try {
                        const cRes = await api.get(`/groups/${firstGroupId}/analytics/category`);
                        if (cRes.data?.success) setCategoryData(cRes.data.data);
                        else if (Array.isArray(cRes.data)) setCategoryData(cRes.data);
                    } catch { /* optional */ }
                }
            } catch (err) {
                console.error('Dashboard fetch error', err);
                setGroupsError('Failed to load your data');
            } finally {
                setLoading(false);
                setGroupsLoading(false);
            }
        };
        fetchAll();
    }, []);

    const handleDelete = async (groupId) => {
        if (!window.confirm('Delete this group? All data will be lost.')) return;
        try {
            await api.delete(`/groups/${groupId}`);
            setGroups(prev => prev.filter(g => g._id !== groupId));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete group');
        }
    };

    const hasChart = categoryData.length > 0;

    return (
        <div className="dashboard-container animate-fade-in">

            {/* ── Hero Banner ──────────────────────────────────────────────── */}
            <div className="dashboard-hero p-4 p-md-5 mb-5">
                <div className="hero-blob hero-blob-1" />
                <div className="hero-blob hero-blob-2" />

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 position-relative">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            {greeting.icon}
                            <span className="fw-medium">{greeting.text}</span>
                        </div>
                        <h1 className="fw-bold mb-1" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: '-0.02em' }}>
                            <span className="text-gradient">{user?.name}</span>
                            <span style={{ WebkitTextFillColor: 'initial', background: 'none' }}>'s Dashboard</span>
                        </h1>
                        <p className="mb-0 text-muted" style={{ fontSize: '1rem' }}>
                            Here's your financial snapshot for today.
                        </p>
                    </div>

                    <div className="d-flex gap-2">
                        <Button
                            as={Link}
                            to="/groups/create"
                            className="btn-modern-primary rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2"
                            style={{ boxShadow: '0 8px 24px rgba(79,70,229,0.35)', fontSize: '0.9rem' }}
                        >
                            <FaPlus /> New Group
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ───────────────────────────────────────────────── */}
            <Row className="g-4 mb-5">
                <Col md={4} className="animate-slide-up stagger-1">
                    <StatCard
                        title="Total Spent"
                        value={loading ? '–' : formatCurrency(stats.totalExpenses, displayCurrency)}
                        icon={<FaMoneyBillWave className="text-white fs-5" />}
                        color="linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                        loading={loading}
                    />
                </Col>
                <Col md={4} className="animate-slide-up stagger-2">
                    <StatCard
                        title={!loading && stats.netBalance < 0 ? 'You Owe' : 'You Are Owed'}
                        value={loading ? '–' : formatCurrency(Math.abs(stats.netBalance || 0), displayCurrency)}
                        icon={<FaBolt className="text-white fs-5" />}
                        color={!loading && stats.netBalance < 0
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}
                        loading={loading}
                    />
                </Col>
                <Col md={4} className="animate-slide-up stagger-3">
                    <StatCard
                        title="Active Groups"
                        value={loading ? '–' : animatedGroups}
                        icon={<FaUsers className="text-white fs-5" />}
                        color="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                        loading={loading}
                    />
                </Col>
            </Row>

            {/* ── Chart + Groups ───────────────────────────────────────────── */}
            <Row className="g-4">
                {/* Spending Doughnut */}
                {hasChart && (
                    <Col lg={4} className="animate-slide-up stagger-2">
                        <div className="glass-card border-0 p-4 h-100 chart-container">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <FaChartPie className="text-primary" />
                                <h5 className="fw-bold mb-0 text-dark">Spending Mix</h5>
                                <span className="badge-live ms-auto text-muted small fw-normal">live</span>
                            </div>
                            <Doughnut
                                data={{
                                    labels: categoryData.map(c => c.category),
                                    datasets: [{
                                        data: categoryData.map(c => c.total),
                                        backgroundColor: CATEGORY_COLORS.slice(0, categoryData.length),
                                        borderWidth: 3,
                                        borderColor: 'rgba(255,255,255,0.9)',
                                        hoverOffset: 10,
                                        hoverBorderWidth: 0,
                                    }]
                                }}
                                options={{
                                    cutout: '65%',
                                    animation: { animateScale: true, duration: 900 },
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { padding: 14, font: { size: 11, family: 'Outfit' }, boxWidth: 10, borderRadius: 4 }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: ctx => ` ${formatCurrency(ctx.parsed, displayCurrency)}`
                                            },
                                            padding: 10,
                                            backgroundColor: 'rgba(15,15,26,0.85)',
                                            titleFont: { size: 12 },
                                            bodyFont: { size: 13, weight: 'bold' },
                                        }
                                    }
                                }}
                            />
                        </div>
                    </Col>
                )}

                {/* Groups panel */}
                <Col lg={hasChart ? 8 : 12} className="animate-slide-up stagger-3">
                    <div className="glass-card border-0 p-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-2">
                                <FaUsers className="text-primary" />
                                <h5 className="fw-bold mb-0 text-dark">Your Groups</h5>
                                {!groupsLoading && (
                                    <span
                                        className="rounded-pill px-2 py-1 ms-1"
                                        style={{
                                            background: 'linear-gradient(135deg,#4f46e5,#8b5cf6)',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {groups.length}
                                    </span>
                                )}
                            </div>
                            <Link
                                to="/groups/create"
                                className="btn btn-sm btn-outline-primary rounded-pill px-3 d-flex align-items-center gap-2 fw-semibold"
                                style={{ fontSize: '0.8rem' }}
                            >
                                <FaPlus size={10} /> Create
                            </Link>
                        </div>

                        {groupsLoading && (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }} />
                            </div>
                        )}

                        {groupsError && <Alert variant="danger">{groupsError}</Alert>}

                        {!groupsLoading && !groupsError && groups.length === 0 && (
                            <div className="text-center py-5">
                                <div
                                    className="mx-auto mb-3 rounded-3 d-flex align-items-center justify-content-center"
                                    style={{ width: 64, height: 64, background: 'linear-gradient(135deg,rgba(79,70,229,0.12),rgba(139,92,246,0.12))' }}
                                >
                                    <FaUsers size={28} style={{ color: '#6366f1' }} />
                                </div>
                                <h6 className="fw-bold text-dark mb-1">No groups yet</h6>
                                <p className="text-muted small mb-3">Create a group to start splitting expenses.</p>
                                <Link to="/groups/create" className="btn btn-sm btn-modern-primary rounded-pill px-4 text-white text-decoration-none">
                                    <FaPlus className="me-2" size={10} /> New Group
                                </Link>
                            </div>
                        )}

                        {!groupsLoading && !groupsError && groups.length > 0 && (
                            <div className="d-flex flex-column gap-3">
                                {groups.map((group, idx) => (
                                    <div key={group._id} className={`animate-slide-up stagger-${Math.min(idx + 1, 4)}`}>
                                        <GroupCard group={group} onDelete={handleDelete} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
