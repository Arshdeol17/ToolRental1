// client/src/App.jsx (READY TO PASTE)

import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

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
import AiChat from "./pages/AiChat.jsx";

import ToolsHistory from "./pages/ToolsHistory.jsx";
import Transactions from "./pages/Transactions.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const navigate = useNavigate();

    const [token, setToken] = useState(localStorage.getItem("token"));

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    }, [token]);

    const userName = user?.name || "";
    const userEmail = String(user?.email || "").toLowerCase();

    // ✅ Admin detection (role OR fallback email)
    const isAdmin =
        String(user?.role || "").toLowerCase() === "admin" ||
        user?.is_admin === true ||
        user?.isAdmin === true ||
        userEmail === "deol5869@gmail.com";

    useEffect(() => {
        const syncAuth = () => setToken(localStorage.getItem("token"));
        window.addEventListener("storage", syncAuth);
        window.addEventListener("login", syncAuth);
        return () => {
            window.removeEventListener("storage", syncAuth);
            window.removeEventListener("login", syncAuth);
        };
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        window.dispatchEvent(new Event("storage"));
        navigate("/login");
    };

    const navLinkClass = "text-white hover:underline text-sm font-semibold";

    return (
        <div>
            {/* BLUE NAVBAR */}
            <div className="bg-blue-600 text-white">
                <div className="w-full px-8 py-3 flex items-center justify-between">
                    <Link to="/" className="font-extrabold text-xl tracking-wide">
                        ToolRental
                    </Link>

                    <div className="flex items-center gap-8">
                        <Link to="/" className={navLinkClass}>
                            Home
                        </Link>

                        <Link to="/tools" className={navLinkClass}>
                            Browse Tools
                        </Link>

                        {token && (
                            <>
                                <Link to="/add-tool" className={navLinkClass}>
                                    Add Tool
                                </Link>

                                <Link to="/profile" className={navLinkClass}>
                                    Profile
                                </Link>

                                <Link to="/tools-history" className={navLinkClass}>
                                    Tools History
                                </Link>

                                <Link to="/transactions" className={navLinkClass}>
                                    Transactions
                                </Link>
                                <Link to="/ai-chat" className={navLinkClass}>
                                    AI Chat
                                </Link>

                                <Link to="/notifications" className={navLinkClass}>
                                    Notifications
                                </Link>

                                <Link to="/rental-requests" className={navLinkClass}>
                                    Rental Requests
                                </Link>

                                <Link to="/my-rentals" className={navLinkClass}>
                                    My Rentals
                                </Link>

                                {/* ✅ ADMIN TAB BACK */}
                                {isAdmin && (
                                    <Link to="/admin" className={navLinkClass}>
                                        Admin Dashboard
                                    </Link>
                                )}

                                <span className="text-white/95 text-sm font-semibold">
                                    Hi, {userName || "User"} 👋
                                </span>

                                <button
                                    onClick={logout}
                                    className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-semibold"
                                    type="button"
                                >
                                    Logout
                                </button>
                            </>
                        )}

                        {!token && (
                            <>
                                <Link to="/login" className={navLinkClass}>
                                    Login
                                </Link>
                                <Link to="/register" className={navLinkClass}>
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            

            {/* ROUTES */}
            <Routes>
                <Route path="/" element={<Home />} />

                <Route path="/login" element={<Login API_BASE={API_BASE} />} />
                <Route path="/register" element={<Register API_BASE={API_BASE} />} />

                <Route path="/tools" element={<Tools />} />

                {/* Redirect old link */}
                <Route path="/tools/add" element={<Navigate to="/add-tool" replace />} />
                <Route path="/add-tool" element={<AddTool API_BASE={API_BASE} />} />

                <Route path="/tools/:id/edit" element={<EditTool API_BASE={API_BASE} />} />
                <Route path="/tools/:id" element={<ToolDetails API_BASE={API_BASE} />} />

                <Route path="/my-rentals" element={<MyRentals />} />
                <Route path="/rental-requests" element={<RentalRequests />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chat/:conversationId" element={<ChatPage />} />

                <Route path="/profile" element={<Profile />} />
                <Route path="/tools-history" element={<ToolsHistory />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/ai-chat" element={<AiChat />} />

                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </div>
    );
}