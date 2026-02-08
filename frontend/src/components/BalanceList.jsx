import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FaArrowRight } from 'react-icons/fa';

const BalanceList = ({ groupId, refreshTrigger }) => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/balances`);
                if (res.data.success) {
                    setBalances(res.data.data);
                }
            } catch (err) {
                setError('Failed to load balances');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBalances();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4">Loading balances...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;

    // Filter out users with 0 or negligible balance for cleaner UI
    // But displaying everyone is also good for confirming they are settled.
    // Let's sort: Owed (Positive) -> Settled (0) -> Owes (Negative)
    const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Net Balances</h3>
            {sortedBalances.map((userBalance) => {
                const bal = userBalance.balance;
                const isOwed = bal > 0;
                const isIndebted = bal < 0;
                const isSettled = Math.abs(bal) < 0.01;

                return (
                    <div key={userBalance.userId} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                {userBalance.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{userBalance.name}</span>
                        </div>

                        <div className="text-right">
                            {isSettled ? (
                                <span className="text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full text-sm">
                                    Settled up
                                </span>
                            ) : isOwed ? (
                                <div className="text-green-600">
                                    <span className="text-xs uppercase font-bold text-gray-500 block">gets back</span>
                                    <span className="font-bold text-lg">${bal.toFixed(2)}</span>
                                </div>
                            ) : (
                                <div className="text-red-600">
                                    <span className="text-xs uppercase font-bold text-gray-500 block">owes</span>
                                    <span className="font-bold text-lg">${Math.abs(bal).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BalanceList;
