import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FaUsers, FaArrowRight } from 'react-icons/fa';

const GroupList = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await api.get('/groups');
                if (res.data.success) {
                    setGroups(res.data.data);
                }
            } catch (err) {
                setError('Failed to load groups');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
    }, []);

    if (loading) return <div className="text-center py-4">Loading groups...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;

    if (groups.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center">
                <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">You haven't joined any groups yet.</p>
                <Link to="/groups/create" className="text-blue-600 font-bold hover:underline">
                    Create your first group
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
                <Link
                    key={group._id}
                    to={`/groups/${group._id}`}
                    className="block bg-white p-5 rounded-lg shadow hover:shadow-md transition border border-transparent hover:border-blue-500"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{group.name}</h3>
                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                                {group.description || 'No description'}
                            </p>
                        </div>
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <FaUsers />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                        <span>{group.members?.length || 1} members</span>
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                            View <FaArrowRight size={12} />
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default GroupList;
