import React, { useState } from 'react';
import api from '../services/api';
import { FaHandHoldingUsd, FaTimes } from 'react-icons/fa';

const RecordSettlement = ({ groupId, members, onSettlementRecorded, onClose, initialData = {} }) => {
    const [payer, setPayer] = useState(initialData.payer || '');
    const [payee, setPayee] = useState(initialData.payee || '');
    const [amount, setAmount] = useState(initialData.amount || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Today's date YYYY-MM-DD
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (payer === payee) {
            setError('Payer and Payee cannot be the same person.');
            return;
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        setLoading(true);

        try {
            const res = await api.post(`/groups/${groupId}/settlements`, {
                payerId: payer,
                payeeId: payee,
                amount: numericAmount,
                date: new Date(date).toISOString()
            });

            if (res.data.success) {
                onSettlementRecorded();
                onClose();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record settlement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FaHandHoldingUsd className="text-green-600" /> Record Payment
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <FaTimes size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Payer (Who Paid?)</label>
                            <select
                                value={payer}
                                onChange={(e) => setPayer(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value="" disabled>Select Payer</option>
                                {members.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Payee (To Whom?)</label>
                            <select
                                value={payee}
                                onChange={(e) => setPayee(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value="" disabled>Select Payee</option>
                                {members.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Amount ($)</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                            >
                                {loading ? 'Saving...' : 'Record Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RecordSettlement;
