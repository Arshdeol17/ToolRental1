import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Tools from "./pages/Tools.jsx";
import AddTool from "./pages/AddTool.jsx";
import ToolDetails from "./pages/ToolDetails.jsx";
import EditTool from "./pages/EditTool.jsx";
import RentalRequests from "./pages/RentalRequests.jsx";
import Notifications from "./pages/Notifications.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import MyRentals from "./pages/MyRentals.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
    const API_BASE = "http://localhost:5000";
    const [token, setToken] = useState(localStorage.getItem("token"));
    useEffect(() => {
    const handleStorageChange = () => {
        setToken(localStorage.getItem("token"));
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event
    window.addEventListener("login", handleStorageChange);
    
    return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("login", handleStorageChange);
    };
}, []);

    // ✅ reactive auth state (fix navbar not updating)
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    const [requestCount, setRequestCount] = useState(0);
    const [notificationCount, setNotificationCount] = useState(0);

    // ✅ keep auth state in sync (works even if localStorage changes)
    useEffect(() => {
        const syncAuth = () => {
            setToken(localStorage.getItem("token"));
            try {
                setUser(JSON.parse(localStorage.getItem("user") || "null"));
            } catch {
                setUser(null);
            }
        };

        // initial sync
        syncAuth();

        // if login/logout happens in another tab
        window.addEventListener("storage", syncAuth);

        // also listen for manual event from Login/Register pages (optional but great)
        window.addEventListener("authChanged", syncAuth);

        return () => {
            window.removeEventListener("storage", syncAuth);
            window.removeEventListener("authChanged", syncAuth);
        };
    }, []);

    const loadCounts = async () => {
        if (!token) {
            setRequestCount(0);
            setNotificationCount(0);
            return;
        }

        try {
            // Owner requests
            const reqRes = await fetch(`${API_BASE}/api/rentals/requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const reqData = await reqRes.json().catch(() => []);
            setRequestCount(
                Array.isArray(reqData)
                    ? reqData.filter((r) => String(r.status).toLowerCase() === "pending").length
                    : 0
            );

            // Renter notifications
            const myRes = await fetch(`${API_BASE}/api/rentals/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const myData = await myRes.json().catch(() => []);
            setNotificationCount(
                Array.isArray(myData)
                    ? myData.filter((r) => String(r.status).toLowerCase() === "pending").length
                    : 0
            );
        } catch (err) {
            console.error("Failed to load counts", err);
        }
    };

    // Live polling for counts
    useEffect(() => {
        loadCounts();
        const interval = setInterval(loadCounts, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // ✅ update navbar instantly
        setToken(null);
        setUser(null);

        // optional: notify other components
        window.dispatchEvent(new Event("authChanged"));

        window.location.href = "/";
       localStorage.removeItem("token");
       setToken(null);
       window.location.href = "/";
    };

    const Badge = ({ count }) =>
        count > 0 ? (
            <span className="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {count}
            </span>
        ) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* NAVBAR */}
            <nav className="bg-blue-600 shadow-sm px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-2xl font-bold text-white">
                        ToolRental
                    </Link>

                    <div className="flex items-center space-x-6">
                        <Link to="/" className="text-white hover:underline">
                            Home
                        </Link>

                        <Link to="/tools" className="text-white hover:underline">
                            Browse Tools
                        </Link>

                        {token && (
                         
                            <Link to="/profile" className="text-white hover:underline">
                              Profile
                            </Link>
                        )}

                        {token && (
                            <Link to="/notifications" className="text-white hover:underline flex items-center">
                                Notifications
                                <Badge count={notificationCount} />
                            </Link>
                        )}

                        {token && (
                            <Link to="/rentals/requests" className="text-white hover:underline flex items-center">
                                Rental Requests
                                <Badge count={requestCount} />
                            </Link>
                        )}

                        {token && (
                            <Link to="/my-rentals" className="text-white hover:underline">
                                My Rentals
                            </Link>
                        )}


                        {token ? (
                            <>
                                <span className="text-white text-sm font-semibold">
                                    Hi{user?.name ? `, ${user.name}` : ""} 👋
                                </span>

                                <button onClick={handleLogout} className="text-white hover:underline">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-white hover:underline">
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className="border border-white px-4 py-1 rounded text-white hover:bg-white hover:text-blue-600 transition"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ROUTES */}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/tools/add" element={<AddTool />} />
                <Route path="/tools/:id" element={<ToolDetails />} />
                <Route path="/tools/:id/edit" element={<EditTool />} />
                <Route path="/rentals/requests" element={<RentalRequests />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chat/:rentalId" element={<ChatPage />} />
                <Route path="/my-rentals" element={<MyRentals />} />
                <Route path="/my-rentals" element={<MyRentals />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        </div>
    );
}
