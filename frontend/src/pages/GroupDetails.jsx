import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FaUsers, FaMoneyBillWave, FaBalanceScale, FaHandHoldingUsd, FaPlus } from 'react-icons/fa';
import AddExpense from '../components/AddExpense';
import ExpenseList from '../components/ExpenseList';

const GroupDetails = () => {
    const { groupId } = useParams();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('expenses');

    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const res = await api.get(`/groups/${groupId}`);
                if (res.data.success) {
                    setGroup(res.data.data);
                }
            } catch (err) {
                setError('Failed to load group details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchGroupDetails();
    }, [groupId]);

    if (loading) return <div className="text-center py-10">Loading...</div>;
    if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
    if (!group) return <div className="text-center py-10">Group not found</div>;

    const tabs = [
        { id: 'expenses', label: 'Expenses', icon: <FaMoneyBillWave /> },
        { id: 'balances', label: 'Balances', icon: <FaBalanceScale /> },
        { id: 'settlements', label: 'Settlements', icon: <FaHandHoldingUsd /> },
    ];

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleExpenseAdded = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowAddExpense(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
                        <p className="text-gray-500 mt-1">{group.description}</p>
                        <div className="mt-3 flex items-center text-sm text-gray-500 gap-2">
                            <FaUsers />
                            <span>{group.members.length} members: </span>
                            <span className="font-medium text-gray-700">
                                {group.members.map(m => m.name).join(', ')}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <button
                            onClick={() => setShowAddExpense(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <FaPlus /> Add Expense
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors duration-200 focus:outline-none ${activeTab === tab.id
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                {activeTab === 'expenses' && (
                    <ExpenseList groupId={groupId} refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'balances' && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Balances will appear here.</p>
                    </div>
                )}
                {activeTab === 'settlements' && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Settlement options will appear here.</p>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showAddExpense && (
                <AddExpense
                    groupId={groupId}
                    members={group.members}
                    onExpenseAdded={handleExpenseAdded}
                    onClose={() => setShowAddExpense(false)}
                />
            )}
        </div>
    );
};

export default GroupDetails;
