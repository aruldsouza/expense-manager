import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaMoneyBillWave, FaTimes } from 'react-icons/fa';

const AddExpense = ({ groupId, members, onExpenseAdded, onClose }) => {
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [payer, setPayer] = useState(user?._id || '');
    const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, UNEQUAL, PERCENT
    const [splits, setSplits] = useState({}); // { userId: amountOrPercent }
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Initialize splits when members change or split type changes
    useEffect(() => {
        const initialSplits = {};
        if (members) {
            members.forEach(m => {
                initialSplits[m._id] = '';
            });
        }
        setSplits(initialSplits);
    }, [members, splitType]);

    // Set default payer to current user if available
    useEffect(() => {
        if (user && !payer) {
            setPayer(user._id);
        }
    }, [user, payer]);

    const handleSplitChange = (userId, value) => {
        setSplits(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const validateSplits = () => {
        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) return 'Invalid amount';

        if (splitType === 'EQUAL') return null;

        let totalSplit = 0;
        const memberIds = members.map(m => m._id);

        memberIds.forEach(id => {
            const val = parseFloat(splits[id] || 0);
            totalSplit += val;
        });

        if (splitType === 'PERCENT') {
            if (Math.abs(totalSplit - 100) > 0.1) return `Total percentage must be 100% (Current: ${totalSplit}%)`;
        } else if (splitType === 'UNEQUAL') {
            if (Math.abs(totalSplit - totalAmount) > 0.01) return `Total split must match expense amount (Current: ${totalSplit}, Required: ${totalAmount})`;
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validateSplits();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const payload = {
                description,
                amount: parseFloat(amount),
                payer,
                splitType,
                splits: []
            };

            if (splitType !== 'EQUAL') {
                payload.splits = members.map(m => ({
                    user: m._id,
                    amount: parseFloat(splits[m._id] || 0)
                }));
            }

            const res = await api.post(`/groups/${groupId}/expenses`, payload);
            if (res.data.success) {
                onExpenseAdded();
                onClose(); // Close modal/form
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FaMoneyBillWave className="text-blue-600" /> Add Expense
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
                        {/* Description */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="e.g., Dinner, Taxi"
                                required
                            />
                        </div>

                        {/* Amount & Payer */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
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
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">Paid By</label>
                                <select
                                    value={payer}
                                    onChange={(e) => setPayer(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                >
                                    <option value="" disabled>Select Payer</option>
                                    {members && members.map(m => (
                                        <option key={m._id} value={m._id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Split Type Selector */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Split Type</label>
                            <div className="flex gap-4">
                                {['EQUAL', 'UNEQUAL', 'PERCENT'].map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="splitType"
                                            value={type}
                                            checked={splitType === type}
                                            onChange={(e) => setSplitType(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="capitalize">{type.toLowerCase()}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Split Details UI */}
                        {splitType !== 'EQUAL' && (
                            <div className="mb-6 bg-gray-50 p-4 rounded border">
                                <h4 className="font-semibold mb-3 text-sm text-gray-700">
                                    Split Details ({splitType === 'PERCENT' ? '%' : '$'})
                                </h4>
                                {members.map(m => (
                                    <div key={m._id} className="flex justify-between items-center mb-2">
                                        <span className="text-sm">{m.name}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step={splitType === 'PERCENT' ? "1" : "0.01"}
                                            value={splits[m._id] || ''}
                                            onChange={(e) => handleSplitChange(m._id, e.target.value)}
                                            className="w-24 border rounded px-2 py-1 text-right"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
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
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                {loading ? 'Saving...' : 'Add Expense'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddExpense;
