import React from "react";

const HomePage = () => {
  const handleAdminLogin = () => {
    // Redirect to Flask admin dashboard route
    window.location.href = '/admin-dashboard';
  };
  

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
      <span className="bg-gray-700 text-yellow-400 px-4 py-1 rounded-full text-sm mb-4">Secure • Reliable • Intelligent</span>
      <h1 className="text-4xl font-bold mb-4">
        <span className="text-yellow-400">Dragon</span> Proctoring System
      </h1>
      <p className="text-center text-lg max-w-xl mb-6">
        The most advanced online exam proctoring solution for educational institutions, ensuring academic integrity with cutting-edge monitoring technology.
      </p>
      <div className="flex space-x-4">
        <button onClick={() => (window.location.href = "/login")} className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-500 transition">
          Student Login
        </button>
        <button onClick={handleAdminLogin} className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-500 transition">
          Admin Login
        </button>
      </div>
      <footer className="absolute bottom-4 text-gray-500 text-sm">
        &copy; 2025 Dragon Proctoring System. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
