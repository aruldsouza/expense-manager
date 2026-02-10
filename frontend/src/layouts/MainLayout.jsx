import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Container } from 'react-bootstrap';

const MainLayout = () => {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Navbar />
            <main className="flex-grow-1">
                <Container className="py-4">
                    <Outlet />
                </Container>
            </main>
            <footer className="bg-dark text-white py-3 text-center mt-auto">
                <Container>
                    <p className="mb-0 small">&copy; {new Date().getFullYear()} Smart Expense Splitter. All rights reserved.</p>
                </Container>
            </footer>
        </div>
    );
};

export default MainLayout;
