import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const API_BASE = "http://localhost:5000";

export default function ChatPage() {
    const { rentalId } = useParams();
    const token = localStorage.getItem("token");

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState("");

    const bottomRef = useRef(null);
    const socketRef = useRef(null);

    const myUserId = useMemo(() => {
        try {
            if (!token) return null;
            const d = jwtDecode(token);
            // your backend uses { userId: ... }
            return d?.userId ?? d?.id ?? d?.user_id ?? null;
        } catch {
            return null;
        }
    }, [token]);

    // auto scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load/create conversation + messages
    useEffect(() => {
        if (!token) return;

        let cancelled = false;

        async function load() {
            setLoading(true);
            setPageError("");

            try {
                // 1) get/create conversation from rentalId
                const convRes = await fetch(`${API_BASE}/api/chat/conversation/${rentalId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const convData = await convRes.json().catch(() => ({}));
                if (!convRes.ok) {
                    if (!cancelled) setPageError(convData.message || "Failed to load conversation");
                    return;
                }

                if (!cancelled) setConversation(convData);

                // 2) load messages
                const msgRes = await fetch(`${API_BASE}/api/chat/messages/${convData.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const msgData = await msgRes.json().catch(() => []);
                if (!msgRes.ok) {
                    if (!cancelled) setPageError(msgData.message || "Failed to load messages");
                    return;
                }

                if (!cancelled) setMessages(Array.isArray(msgData) ? msgData : []);
            } catch (err) {
                if (!cancelled) setPageError(err?.message || "Chat failed to load");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [rentalId, token]);

    // Socket setup
    useEffect(() => {
        if (!token || !conversation?.id) return;

        const socket = io(API_BASE, {
            auth: { token },
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("joinConversation", { conversationId: conversation.id });
        });

        socket.on("connect_error", (err) => {
            console.error("socket connect_error:", err?.message);
        });

        socket.on("newMessage", (msg) => {
            try {
                if (String(msg?.conversation_id) === String(conversation.id)) {
                    setMessages((prev) => [...prev, msg]);
                }
            } catch (e) {
                console.error("newMessage handler error:", e);
            }
        });

        return () => {
            try {
                socket.emit("leaveConversation", { conversationId: conversation.id });
                socket.disconnect();
            } catch { }
            socketRef.current = null;
        };
    }, [conversation?.id, token]);

    async function sendMessage() {
        const body = String(text || "").trim();
        if (!body) return;
        if (!token || !conversation?.id) return;

        setText("");

        try {
            const res = await fetch(`${API_BASE}/api/chat/messages/${conversation.id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ body }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(data.message || "Failed to send message");
                setText(body);
            }
            // No need to push locally; socket broadcast will add it
        } catch (err) {
            alert(err?.message || "Failed to send message");
            setText(body);
        }
    }

    // Not logged in
    if (!token) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-10">
                <p className="text-gray-700">Please login to use chat.</p>
                <Link to="/login" className="text-blue-600 hover:underline">
                    Go to login
                </Link>
            </div>
        );
    }

    // Error state (prevents blank screen)
    if (pageError) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-10">
                <Link to="/notifications" className="text-blue-600 hover:underline">
                    ← Back
                </Link>
                <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-gray-900">Chat error</h2>
                    <p className="text-sm text-gray-600 mt-2">{pageError}</p>
                    <p className="text-xs text-gray-500 mt-3">
                        Check backend console for errors, and confirm /api/chat routes are mounted.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-10">
                <p className="text-gray-600">Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <Link to="/notifications" className="text-blue-600 hover:underline">
                    ← Back
                </Link>

                <div className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b bg-gray-50">
                        <h1 className="text-lg font-bold text-gray-900">
                            Chat (Rental #{rentalId})
                        </h1>
                        <p className="text-sm text-gray-600">
                            Only you and the other person can see this conversation.
                        </p>
                    </div>

                    <div className="h-[520px] overflow-y-auto p-5 space-y-3">
                        {messages.map((m) => {
                            const mine = myUserId && String(m.sender_id) === String(myUserId);
                            const time = m.created_at ? new Date(m.created_at).toLocaleString() : "";
                            return (
                                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-900 border border-gray-200"
                                            }`}
                                    >
                                        <div>{m.body}</div>
                                        {time && (
                                            <div className={`mt-1 text-[11px] ${mine ? "text-blue-100" : "text-gray-500"}`}>
                                                {time}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    <div className="p-4 border-t bg-white">
                        <div className="flex gap-2">
                            <input
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") sendMessage();
                                }}
                                placeholder="Type a message..."
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!String(text).trim()}
                                className={`px-5 py-2 rounded-xl font-semibold transition ${String(text).trim()
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-gray-300 text-white cursor-not-allowed"
                                    }`}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
