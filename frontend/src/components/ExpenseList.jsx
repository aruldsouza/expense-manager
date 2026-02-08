import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FaCalendarAlt, FaUser } from 'react-icons/fa';

const ExpenseList = ({ groupId, refreshTrigger }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/expenses`);
                if (res.data.success) {
                    setExpenses(res.data.data);
                }
            } catch (err) {
                setError('Failed to load expenses');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4">Loading expenses...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;

    if (expenses.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No expenses recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {expenses.map((expense) => (
                <div key={expense._id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-800 text-lg">{expense.description}</span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase">
                                    {expense.splitType.toLowerCase()}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <FaUser className="text-gray-400" />
                                    Paid by <span className="font-medium text-gray-700">{expense.payer.name}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaCalendarAlt className="text-gray-400" />
                                    {new Date(expense.date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-xl font-bold text-blue-600">
                                ${expense.amount.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExpenseList;
