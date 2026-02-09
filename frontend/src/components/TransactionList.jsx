import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FaMoneyBillWave, FaExchangeAlt, FaArrowRight } from 'react-icons/fa';

const TransactionList = ({ groupId, refreshTrigger }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
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

    if (loading) return <div className="text-center py-4">Loading history...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;

    if (transactions.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No transactions yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {transactions.map((t) => {
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
            })}
        </div>
    );
};

export default TransactionList;
