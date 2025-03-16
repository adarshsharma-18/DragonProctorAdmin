
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md p-8 text-center rounded-2xl animate-fade-in">
        <h1 className="text-6xl font-semibold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          The page you're looking for doesn't exist.
        </p>
        <button 
          onClick={() => navigate('/')} 
          className="btn-primary"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
