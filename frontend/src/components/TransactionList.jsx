import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FaMoneyBillWave, FaExchangeAlt, FaArrowRight } from 'react-icons/fa';

const TransactionList = ({ groupId, refreshTrigger }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // ... (fetch logic remains same)
        const fetchTransactions = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/transactions`);
                if (res.data.success) {
                    setTransactions(res.data.data);
                }
            } catch (err) {
                setError('Failed to load transaction history');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [groupId, refreshTrigger]);

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'all') return true;
        if (filter === 'expenses') return t.type === 'EXPENSE';
        if (filter === 'settlements') return t.type === 'SETTLEMENT';
        return true;
    });

    if (loading) return <div className="text-center py-4">Loading history...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;

    return (
        <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex justify-end gap-2 mb-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('expenses')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition ${filter === 'expenses' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Expenses
                </button>
                <button
                    onClick={() => setFilter('settlements')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition ${filter === 'settlements' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Settlements
                </button>
            </div>

            {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No transactions found.</p>
                </div>
            ) : (
                filteredTransactions.map((t) => {
                    const isExpense = t.type === 'EXPENSE';
                    const date = new Date(t.date).toLocaleDateString();

                    return (
                        <div key={t.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${isExpense ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    {isExpense ? <FaMoneyBillWave /> : <FaExchangeAlt />}
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-800">
                                        {isExpense ? t.description : 'Settlement'}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {isExpense ? (
                                            <span>
                                                <span className="font-medium text-gray-700">{t.payerName}</span> paid for everyone
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <span className="font-medium text-gray-700">{t.payerName}</span>
                                                <FaArrowRight size={10} />
                                                <span className="font-medium text-gray-700">{t.payeeName}</span>
                                            </span>
                                        )}
                                    </p>
                                    <span className="text-xs text-gray-400">{date}</span>
                                </div>
                            </div>

                            <div className={`font-bold text-lg ${isExpense ? 'text-gray-800' : 'text-green-600'}`}>
                                ${t.amount.toFixed(2)}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default TransactionList;
