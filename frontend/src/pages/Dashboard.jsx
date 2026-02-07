import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaUsers, FaMoneyBillWave, FaChartPie, FaPlus } from 'react-icons/fa';

const Dashboard = () => {
    const { user } = useAuth();

    const StatCard = ({ title, value, icon, color }) => (
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: color }}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-sm font-medium uppercase">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-full bg-opacity-20`} style={{ backgroundColor: color }}>
                    {React.cloneElement(icon, { className: `text-xl`, style: { color: color } })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-blue-600 text-white p-6 rounded-lg shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
                    <p className="text-blue-100 mt-2">Here's what's happening with your expenses.</p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                    <Link
                        to="/groups/create"
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
                    >
                        <FaPlus /> New Group
                    </Link>
                </div>
            </div>

            {/* Quick Stats (Placeholder for now) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Expenses"
                    value="$0.00"
                    icon={<FaMoneyBillWave />}
                    color="#EF4444"
                />
                <StatCard
                    title="You are owed"
                    value="$0.00"
                    icon={<FaChartPie />}
                    color="#10B981"
                />
                <StatCard
                    title="Active Groups"
                    value="0"
                    icon={<FaUsers />}
                    color="#3B82F6"
                />
            </div>

            {/* Recent Activity / Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FaUsers className="text-blue-500" /> Your Groups
                    </h2>
                    <div className="text-center py-8 text-gray-500">
                        <p>No groups yet.</p>
                        <Link to="/groups/create" className="text-blue-500 hover:underline mt-2 inline-block">
                            Create your first group
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        Recent Activity
                    </h2>
                    <div className="text-center py-8 text-gray-500">
                        <p>No recent activity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
