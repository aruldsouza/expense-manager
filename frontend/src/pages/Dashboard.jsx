import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FaUsers, FaMoneyBillWave, FaChartPie, FaPlus } from 'react-icons/fa';
import GroupList from '../components/GroupList';
import StatCard from '../components/StatCard';
import { Row, Col, Button, Card } from 'react-bootstrap';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useCurrency } from '../context/CurrencyContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORY_COLORS = [
    '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#10b981', '#6366f1', '#6b7280', '#f97316'
];

const Dashboard = () => {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const [stats, setStats] = useState({
        totalExpenses: 0,
        youAreOwed: 0,
        activeGroups: 0
    });
    const [categoryData, setCategoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, groupsRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/groups')
                ]);
                if (statsRes.data.success) setStats(statsRes.data.data);

                // Load category analytics from first group (as a sample)
                if (groupsRes.data.success && groupsRes.data.data.length > 0) {
                    const firstGroupId = groupsRes.data.data[0]._id;
                    const d = new Date();
                    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    try {
                        const cRes = await api.get(`/groups/${firstGroupId}/analytics`, { params: { month } });
                        if (cRes.data.success) setCategoryData(cRes.data.data);
                    } catch { /* analytics optional */ }
                }
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="dashboard-container animate-fade-in">
            {/* Header */}
            <div className="glass-card p-5 mb-5 d-flex flex-column flex-md-row justify-content-between align-items-center border-0 position-relative overflow-hidden">
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)', zIndex: -1 }}></div>
                <div className="mb-3 mb-md-0 position-relative">
                    <h1 className="h2 fw-bold mb-2">
                        Welcome back, <span className="text-gradient">{user?.name}!</span>
                    </h1>
                    <p className="mb-0 text-muted fs-5">Here's what's happening with your expenses.</p>
                </div>
                <div>
                    <Button
                        as={Link}
                        to="/groups/create"
                        className="btn-modern-primary rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm"
                    >
                        <FaPlus /> New Group
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <Row className="g-4 mb-5">
                <Col md={4}>
                    <StatCard
                        title="You Spent"
                        value={`$${stats.totalExpenses.toFixed(2)}`}
                        icon={<FaMoneyBillWave className="text-white fs-4" />}
                        color="linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                        loading={loading}
                        className="shadow-sm border-0"
                    />
                </Col>
                <Col md={4}>
                    <StatCard
                        title={stats.netBalance > 0 ? "You are owed" : "You owe"}
                        value={`$${Math.abs(stats.netBalance || 0).toFixed(2)}`}
                        icon={<FaChartPie className="text-white fs-4" />}
                        color={stats.netBalance >= 0
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"}
                        loading={loading}
                        className="shadow-sm border-0"
                    />
                </Col>
                <Col md={4}>
                    <StatCard
                        title="Active Groups"
                        value={stats.activeGroups}
                        icon={<FaUsers className="text-white fs-4" />}
                        color="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                        loading={loading}
                        className="shadow-sm border-0"
                    />
                </Col>
            </Row>

            {/* Spending Chart + Groups row */}
            <Row className="g-4">
                {categoryData.length > 0 && (
                    <Col lg={4}>
                        <div className="glass-card border-0 p-4 h-100">
                            <h4 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark mb-3">
                                <FaChartPie className="text-primary" /> This Month
                            </h4>
                            <Doughnut
                                data={{
                                    labels: categoryData.map(c => c.category),
                                    datasets: [{
                                        data: categoryData.map(c => c.total),
                                        backgroundColor: CATEGORY_COLORS.slice(0, categoryData.length),
                                        borderWidth: 2,
                                        borderColor: '#fff',
                                        hoverOffset: 6
                                    }]
                                }}
                                options={{
                                    cutout: '60%',
                                    plugins: {
                                        legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } },
                                        tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.toFixed(2)}` } }
                                    }
                                }}
                            />
                        </div>
                    </Col>
                )}
                <Col lg={categoryData.length > 0 ? 8 : 12}>
                    <div className="glass-card border-0 p-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                                <FaUsers className="text-primary" /> Your Groups
                            </h4>
                            <Link to="/groups/create" className="text-decoration-none fw-bold text-primary">View All</Link>
                        </div>
                        <GroupList />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
