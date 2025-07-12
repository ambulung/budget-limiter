import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';

// ProtectedRoute component to restrict access to Dashboard
const ProtectedRoute = ({ user, children }) => {
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Don't set user if it's null (logout) and we are already in guest mode
      if (currentUser || !user?.isGuest) {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleGuestLogin = () => {
    const guestUser = {
      uid: 'guest',
      displayName: 'Guest',
      isGuest: true,
    };
    setUser(guestUser);
    toast.success('You are now in Guest Mode!');
  };

  const handleLogout = async () => {
    try {
      if (user && !user.isGuest) {
        await signOut(auth);
      }
      setUser(null); // This handles both guest and real user logout
      toast.success('Logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex flex-col">
        <Toaster position="top-center" reverseOrder={false} />
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={<Login onGuestLogin={handleGuestLogin} />} />
            <Route path="/" element={<Login onGuestLogin={handleGuestLogin} />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <Dashboard user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;