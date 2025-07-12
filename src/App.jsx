import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

// Component Imports
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // STATE LIFTING: The state for the settings modal now lives in the top-level App component.
  // This allows the Header button to control the modal inside the Dashboard.
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Effect to check for authentication state changes on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Logout handler function to be passed down
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // No success toast needed as the app will redirect to the login page
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out.");
    }
  };

  // Display a loading screen while Firebase is checking auth state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    // This flex layout ensures the footer sticks to the bottom of the screen
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* The Header now receives props to control logout and settings */}
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onOpenSettings={() => setShowSetupModal(true)} 
      />
      
      {/* The main content area will expand to fill available space */}
      <main className="flex-grow">
        {user ? (
          // If a user is logged in, show the Dashboard
          <Dashboard 
            user={user} 
            showSetupModal={showSetupModal} 
            setShowSetupModal={setShowSetupModal} 
          />
        ) : (
          // Otherwise, show the Login screen
          <Login />
        )}
      </main>

      {/* The Footer is displayed at the bottom of the page */}
      <Footer />
    </div>
  );
}

export default App;