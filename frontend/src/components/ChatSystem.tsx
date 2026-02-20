import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';

interface Chat {
    id: number;
    nombre: string;
    empresa: string;
    participantes: string[];
}

interface Message {
    id: number;
    remitente: string;
    remitente_email: string;
    contenido: string;
    fecha: string;
}

const ChatSystem: React.FC = () => {
    const { user } = useUser();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchChats = async () => {
            if (!user?.email) return;
            try {
                const res = await axios.post('http://localhost:8000/api/chat/list', { email: user.email });
                setChats(res.data);
                if (res.data.length > 0) setSelectedChat(res.data[0]);
            } catch (err) {
                console.error("Error fetching chats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChats();
    }, [user]);

    useEffect(() => {
        if (!selectedChat) return;
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/chat/${selectedChat.id}/messages`);
                setMessages(res.data);
                setTimeout(scrollToBottom, 100);
            } catch (err) {
                console.error("Error fetching messages", err);
            }
        };
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Polling every 5s
        return () => clearInterval(interval);
    }, [selectedChat]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !user?.email) return;

        try {
            await axios.post(`http://localhost:8000/api/chat/${selectedChat.id}/send`, {
                email: user.email,
                contenido: newMessage
            });
            setNewMessage('');
            // Optimistic update or just fetch
            const res = await axios.get(`http://localhost:8000/api/chat/${selectedChat.id}/messages`);
            setMessages(res.data);
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            console.error("Error sending message", err);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando conversaciones...</div>;

    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">forum</span>
                <p className="font-bold">No hay chats activos todavía.</p>
                <p className="text-sm">Se crearán automáticamente cuando tu convenio sea validado.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold dark:text-white">Mensajes Directos</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => setSelectedChat(chat)}
                            className={`w-full p-4 flex flex-col items-start gap-1 border-b border-slate-100 dark:border-slate-800 transition-colors ${selectedChat?.id === chat.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <span className="text-sm font-bold dark:text-white">{chat.nombre}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{chat.empresa}</span>
                            <div className="flex gap-1 mt-1">
                                {chat.participantes.slice(0, 3).map((p, i) => (
                                    <div key={i} className="size-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold" title={p ?? 'Usuario'}>
                                        {p ? p[0] : '?'}
                                    </div>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                            <div>
                                <h4 className="font-bold text-sm dark:text-white">{selectedChat.nombre}</h4>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{selectedChat.empresa}</p>
                            </div>
                            <div className="flex -space-x-2">
                                {selectedChat.participantes.map((p, i) => (
                                    <div key={i} className="size-8 rounded-full border-2 border-white dark:border-slate-900 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary" title={p ?? 'Usuario'}>
                                        {p ? p.substring(0, 2).toUpperCase() : '??'}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-[#0B111A]">
                            {messages.map((msg) => {
                                const isMe = msg.remitente_email === user?.email;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[70%] group`}>
                                            {!isMe && <p className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.remitente}</p>}
                                            <div className={`p-3 rounded-2xl shadow-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700'}`}>
                                                <p className="text-sm">{msg.contenido}</p>
                                            </div>
                                            <p className={`text-[9px] text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                                >
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-6xl opacity-10">chat_bubble</span>
                        <p className="mt-4">Selecciona un chat para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSystem;
