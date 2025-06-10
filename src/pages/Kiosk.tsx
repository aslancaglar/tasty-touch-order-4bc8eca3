
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const Kiosk = () => {
  const { restaurantSlug } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Kiosk Interface</h1>
        <p>Restaurant: {restaurantSlug}</p>
        <p>Welcome to the kiosk ordering system.</p>
      </div>
    </div>
  );
};

export default Kiosk;
