import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FaCheckCircle, FaExchangeAlt } from 'react-icons/fa';

const SettlementList = ({ groupId, refreshTrigger, onMarkPaid }) => {
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSettlements = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/settlements/optimized`);
                if (res.data.success) {
                    setSettlements(res.data.data);
                }
            } catch (err) {
                setError('Failed to load settlement suggestions');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettlements();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4">Loading suggestions...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;

    if (settlements.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-700">All Settled Up!</h3>
                <p className="text-gray-500">No pending debts in this group.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-700">
                    These are optimized settlement suggestions to minimize transactions.
                </p>
            </div>

            {settlements.map((s, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-center justify-between bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-red-600">{s.debtorName}</span>
                            <span className="text-gray-500 text-sm">pays</span>
                            <span className="font-bold text-green-600">{s.creditorName}</span>
                        </div>
                        <FaExchangeAlt className="text-gray-400" />
                        <span className="font-bold text-xl text-gray-800">${s.amount.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={() => onMarkPaid(s)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1 px-3 rounded text-sm transition"
                    >
                        Mark as Paid
                    </button>
                </div>
            ))}
        </div>
    );
};

export default SettlementList;
