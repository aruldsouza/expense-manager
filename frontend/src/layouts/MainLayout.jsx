import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MainLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Outlet />
            </main>
            <footer className="bg-gray-800 text-white py-4 text-center">
                <p>&copy; {new Date().getFullYear()} Smart Expense Splitter</p>
            </footer>
        </div>
    );
};

export default MainLayout;
