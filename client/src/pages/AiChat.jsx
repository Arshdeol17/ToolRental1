// client/src/pages/AiChat.jsx (READY TO PASTE)
import { useEffect, useRef, useState } from "react";

export default function AiChat() {
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("token");

    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hi! Ask me anything about ToolRental 😊" },
    ]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const send = async () => {
        const msg = text.trim();
        if (!msg || loading) return;

        if (!token) {
            alert("Please login first to use AI chat.");
            return;
        }

        const nextMessages = [...messages, { role: "user", content: msg }];
        setMessages(nextMessages);
        setText("");

        try {
            setLoading(true);

            const history = nextMessages
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map((m) => ({ role: m.role, content: m.content }));

            const res = await fetch(`${API_BASE}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: msg, history }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // show the best possible message coming from backend
                alert(data?.message || data?.error || "AI chat failed");
                return;
            }

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.reply || "" },
            ]);
        } catch (e) {
            console.error(e);
            alert("AI chat failed");
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-6 py-10">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">AI Chat</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Ask questions about tools, rentals, payments, returns, transactions, etc.
                        </p>
                    </div>
                </div>

                <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="h-[480px] overflow-y-auto p-5 space-y-3">
                        {messages.map((m, idx) => (
                            <div
                                key={idx}
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user"
                                        ? "ml-auto bg-blue-600 text-white"
                                        : "mr-auto bg-gray-100 text-gray-900"
                                    }`}
                            >
                                {m.content}
                            </div>
                        ))}

                        {loading && (
                            <div className="mr-auto bg-gray-100 text-gray-900 max-w-[85%] rounded-2xl px-4 py-3 text-sm">
                                Typing…
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <div className="border-t border-gray-200 p-4">
                        <div className="flex gap-3">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={2}
                                placeholder="Type your question…"
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none"
                            />
                            <button
                                onClick={send}
                                disabled={loading || !text.trim()}
                                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                                type="button"
                            >
                                Send
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Tip: Press Enter to send, Shift+Enter for new line.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}