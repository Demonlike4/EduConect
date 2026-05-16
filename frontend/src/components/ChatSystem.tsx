import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { assetUrl } from '../lib/urls';
import { useUser } from '../context/UserContext';

interface Chat {
    id: number;
    nombre: string;
    ultimo_mensaje: string;
    fecha: string;
    candidatura?: {
        empresa: string;
        alumno: string;
    };
    participantes: { id: number; nombre: string; is_empresa: boolean; foto: string | null }[];
}

interface Message {
    id: number;
    remitente: string;
    remitente_email: string;
    remitente_foto: string | null;
    remitente_is_empresa: boolean;
    contenido: string;
    fecha: string;
    leido_por_todos: boolean;
}

const ChatSystem: React.FC = () => {
    const { user } = useUser();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    const [showSettings, setShowSettings] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, messageId: number } | null>(null);

    const emojis = ['👋', '✅', '🚀', '🔥', '💡', '🤝', '📅', '📝', '📍', '⭐', '👍', '🙏'];

    const scrollToBottom = (isManual = false) => {
        if (!messagesContainerRef.current) return;
        
        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        
        if (isManual || isNearBottom) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: isManual ? "smooth" : "auto"
            });
        }
    };

    useEffect(() => {
        const fetchChats = async () => {
            if (!user) return;
            try {
                const res = await api.get('/chat/list');
                setChats(res.data);
                if (res.data.length > 0 && !selectedChat) setSelectedChat(res.data[0]);
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
        
        const markAsRead = async () => {
            try {
                await api.post(`/chat/${selectedChat.id}/read`);
            } catch (err) {
                console.error("Error marking as read", err);
            }
        };

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/chat/${selectedChat.id}/messages`);
                if (res.status === 200) {
                    setMessages(res.data);
                    setTimeout(() => scrollToBottom(), 100);
                    markAsRead();
                }
            } catch (err) {
                console.error("Error fetching messages", err);
            }
        };
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); 
        return () => clearInterval(interval);
    }, [selectedChat, user]);

    const handleDeleteMessage = async (messageId: number) => {
        try {
            await api.delete(`/chat/message/${messageId}`);
            setMessages((prev: any[]) => prev.filter((m: any) => m.id !== messageId));
            setContextMenu(null);
        } catch (err) {
            console.error("Error deleting message", err);
        }
    };

    const handleSend = async (e?: React.FormEvent, contentOverride?: string) => {
        if (e) e.preventDefault();
        const content = contentOverride || newMessage;
        if (!content.trim() || !selectedChat) return;

        try {
            await api.post(`/chat/${selectedChat.id}/send`, {
                contenido: content
            });
            if (!contentOverride) setNewMessage('');
            const res = await api.get(`/chat/${selectedChat.id}/messages`);
            setMessages(res.data);
            setTimeout(() => scrollToBottom(true), 50);
            setShowEmojiPicker(false);
        } catch (err) {
            console.error("Error sending message", err);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleSend(undefined, `📎 Archivo adjunto: ${file.name}`);
        }
    };

    const filteredChats = chats.filter((c: any) => 
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.candidatura?.empresa.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
            <span className="material-symbols-outlined animate-spin text-5xl text-indigo-600 mb-4">progress_activity</span>
            <p className="text-zinc-400 font-semibold tracking-wide text-[10px] tracking-widest">Sincronizando Mensajería...</p>
        </div>
    );

    if (chats.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                <div className="size-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-indigo-600">forum</span>
                </div>
                <h3 className="text-xl font-black dark:text-white mb-2">Sin conversaciones activas</h3>
                <p className="text-zinc-500 text-sm max-w-sm">Los canales de comunicación se habilitarán automáticamente al validar convenios o tutorías.</p>
            </div>
        );
    }

    const cleanName = (text: string) => {
        // Elimina el texto entre paréntesis o después de un guion (ej: " - Bakend / Fronted")
        return text.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*-\s*.*?\s*\/\s*.*?\s*/g, '').trim();
    };

    const getAvatarUrl = (foto: string | null, isEmpresa: boolean) => {
        if (!foto) return null;
        const folder = isEmpresa ? 'logos' : 'fotos';
        return assetUrl(foto.startsWith('/uploads') ? foto : `/uploads/${folder}/${foto}`);
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date);
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100dvh-64px)] lg:h-[calc(100dvh-140px)] w-full bg-white dark:bg-zinc-950 lg:rounded-[2.5rem] border-x lg:border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in duration-700">
            {/* Sidebar Superior - Canales */}
            <div className={`w-full lg:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 h-full ${selectedChat && 'hidden lg:flex'}`}>
                <div className="p-4 lg:p-8 pb-2 lg:pb-4">
                    <h3 className="text-xl lg:text-2xl font-black dark:text-white tracking-tight mb-4 lg:mb-6 flex items-center gap-3">
                        <span className="material-symbols-outlined text-indigo-600">forum</span>
                        Canales
                    </h3>
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors text-[18px] lg:text-[20px]">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar contacto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-xl lg:rounded-2xl text-[11px] lg:text-xs font-bold dark:text-zinc-200 focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-xs transition-all placeholder:text-zinc-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-2 lg:space-y-3 custom-scrollbar">
                    {filteredChats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => setSelectedChat(chat)}
                            className={`w-full p-3 lg:p-4 rounded-2xl lg:rounded-3xl flex items-center gap-3 lg:gap-4 transition-all duration-300 relative group overflow-hidden ${
                                selectedChat?.id === chat.id 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1' 
                                : 'hover:bg-white dark:hover:bg-zinc-800 hover:shadow-lg border border-zinc-100 dark:border-zinc-700'
                            }`}
                        >
                            <div className={`size-12 rounded-full flex items-center justify-center text-xs lg:text-sm font-black shrink-0 shadow-sm transition-transform group-hover:scale-105 overflow-hidden ${
                                selectedChat?.id === chat.id ? 'bg-white/20' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white'
                            }`}>
                                {(() => {
                                    const other = chat.participantes.find(p => p.nombre !== user?.nombre);
                                    const url = other ? getAvatarUrl(other.foto, other.is_empresa) : null;
                                    return url ? (
                                        <img src={url} className="w-full h-full object-cover" alt="Perfil" />
                                    ) : (
                                        chat.nombre.substring(0, 2).toUpperCase()
                                    );
                                })()}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-center mb-0.5">
                                    <h4 className="font-black text-xs lg:text-sm truncate tracking-tight">{cleanName(chat.nombre)}</h4>
                                    <span className={`text-[8px] lg:text-[9px] font-semibold tracking-wide opacity-70 shrink-0 ${selectedChat?.id === chat.id ? 'text-white' : 'text-zinc-400'}`}>
                                        {formatTime(chat.fecha)}
                                    </span>
                                </div>
                                <p className={`text-[10px] lg:text-[11px] font-medium truncate leading-tight ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-zinc-500'}`}>
                                    {chat.ultimo_mensaje}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 min-h-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 relative ${!selectedChat && 'hidden lg:flex'}`}>
                {selectedChat ? (
                    <>
                        {/* Elegant Decorative Elements - Simplified */}
                        <div className="absolute top-0 right-0 w-64 lg:w-96 h-64 lg:h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                        {/* Header Premium */}
                        <div className="p-3 lg:p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center backdrop-blur-2xl bg-white/80 dark:bg-zinc-950/80 z-20">
                            <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0 mr-2">
                                <button className="lg:hidden p-1 -ml-1 text-zinc-400 shrink-0" onClick={() => setSelectedChat(null)}>
                                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                                </button>
                                <div className="size-9 lg:size-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg lg:rounded-2xl flex items-center justify-center text-[10px] lg:text-xs font-black shadow-lg ring-2 ring-zinc-50 dark:ring-zinc-800/50 overflow-hidden shrink-0">
                                    {(() => {
                                        const other = selectedChat.participantes.find(p => p.nombre !== user?.nombre);
                                        const url = other ? getAvatarUrl(other.foto, other.is_empresa) : null;
                                        return url ? (
                                            <img src={url} className="w-full h-full object-cover" alt="Perfil" />
                                        ) : (
                                            selectedChat.nombre.substring(0, 2).toUpperCase()
                                        );
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-xs lg:text-base dark:text-white tracking-tight leading-none truncate">{cleanName(selectedChat.nombre)}</h4>
                                        <span className="material-symbols-outlined text-[14px] lg:text-[16px] text-emerald-500">lock</span>
                                    </div>
                                    <p className="text-[7px] lg:text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Conexión Cifrada</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 lg:gap-3">
                                <div className="flex items-center gap-2 lg:gap-3 relative">
                                    <button 
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={`size-8 lg:size-11 rounded-lg lg:rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 ${showSettings ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-lg' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px] lg:text-[20px]">settings</span>
                                    </button>

                                    {showSettings && (
                                        <div className="absolute top-full right-0 mt-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl lg:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xl min-w-[200px] z-50 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-[10px] font-semibold tracking-wide text-zinc-400 tracking-widest">Tamaño Letra</span>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => setFontSize((v: number) => Math.max(10, v - 2))}
                                                            className="size-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 flex items-center justify-center text-xs font-black transition-colors"
                                                        >-</button>
                                                        <span className="text-[11px] font-black w-6 text-center">{fontSize}</span>
                                                        <button 
                                                            onClick={() => setFontSize((v: number) => Math.min(24, v + 2))}
                                                            className="size-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 flex items-center justify-center text-xs font-black transition-colors"
                                                        >+</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {selectedChat.participantes.map((p: any) => (
                                                        <div key={p.id} className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-800 relative group/p">
                                                            <span className="text-[10px] font-black">{p.nombre[0]}</span>
                                                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[8px] font-black rounded-lg opacity-0 group-hover/p:opacity-100 transition-opacity whitespace-nowrap z-50">
                                                                {p.nombre}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="h-px bg-zinc-100 dark:bg-zinc-800"></div>
                                                <p className="text-[9px] font-bold text-zinc-400 leading-tight">Configuración local del visualizador de chat.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div 
                            ref={messagesContainerRef}
                            onClick={() => { setShowEmojiPicker(false); setShowSettings(false); setContextMenu(null); }}
                            className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-12 space-y-4 lg:space-y-10 custom-scrollbar relative z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] lg:[background-size:32px_32px] [background-position: center] opacity-80"
                        >
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                                    <div className="size-16 lg:size-24 rounded-[1.5rem] lg:rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 lg:mb-6">
                                        <span className="material-symbols-outlined text-3xl lg:text-5xl">lock</span>
                                    </div>
                                    <p className="font-semibold tracking-wide text-[8px] lg:text-[9px]">Comunicación Cifrada</p>
                                </div>
                            ) : (
                                messages.map((msg: any, idx: number) => {
                                    const isMe = msg.remitente_email === user?.email;
                                    const prevMsg = messages[idx - 1];
                                    const nextMsg = messages[idx + 1];
                                    const isSameUserAsPrev = prevMsg && prevMsg.remitente_email === msg.remitente_email;
                                    const isSameUserAsNext = nextMsg && nextMsg.remitente_email === msg.remitente_email;
                                    
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500 ${isSameUserAsNext ? 'mb-1' : 'mb-6 lg:mb-12'}`}>
                                            <div className={`max-w-[92%] lg:max-w-[75%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && !isSameUserAsPrev && (
                                                    <div className="flex items-center gap-2 mb-2 ml-4">
                                                        <div className="size-4 lg:size-5 rounded-md lg:rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 flex items-center justify-center text-[7px] lg:text-[8px] font-black text-white overflow-hidden shrink-0">
                                                            {(() => {
                                                                const url = getAvatarUrl(msg.remitente_foto, msg.remitente_is_empresa);
                                                                return url ? (
                                                                    <img src={url} className="w-full h-full object-cover" alt="Perfil" />
                                                                ) : (
                                                                    msg.remitente.substring(0, 1).toUpperCase()
                                                                );
                                                            })()}
                                                        </div>
                                                        <span className="text-[9px] lg:text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate max-w-[120px]">{msg.remitente}</span>
                                                    </div>
                                                )}
                                                <div 
                                                    onContextMenu={(e: React.MouseEvent) => {
                                                        if (isMe) {
                                                            e.preventDefault();
                                                            setContextMenu({ x: e.pageX, y: e.pageY, messageId: msg.id });
                                                        }
                                                    }}
                                                    className={`inline-flex flex-col min-w-[80px] px-4 py-2 transition-all duration-300 shadow-sm ${
                                                        isMe 
                                                        ? `bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 ${isSameUserAsNext ? 'rounded-2xl' : 'rounded-2xl rounded-br-sm'}` 
                                                        : `bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-700 shadow-sm ${isSameUserAsNext ? 'rounded-2xl' : 'rounded-2xl rounded-bl-sm'}`
                                                    }`}
                                                >
                                                    {msg.contenido.startsWith('📎 Archivo adjunto:') ? (
                                                        <div className="flex items-center gap-3 py-1">
                                                            <div className="size-8 lg:size-10 rounded-lg lg:rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-lg lg:text-xl">description</span>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[8px] lg:text-[10px] font-semibold tracking-wide opacity-60 leading-none mb-1">Documento</span>
                                                                <span className="text-xs lg:text-sm font-bold tracking-tight truncate">{msg.contenido.replace('📎 Archivo adjunto: ', '')}</span>
                                                            </div>
                                                        </div>
                                                    ) : msg.contenido.length <= 4 && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(msg.contenido) ? (
                                                        <span className="text-3xl lg:text-4xl py-2 mb-1 block">{msg.contenido}</span>
                                                    ) : (
                                                        <p className="font-bold leading-relaxed tracking-tight break-words" style={{ fontSize: `${fontSize}px` }}>{msg.contenido}</p>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-1 self-end mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                         <span className="text-[10px] tracking-wide leading-none">
                                                            {formatTime(msg.fecha)}
                                                         </span>
                                                         {isMe && (
                                                            <span className={`material-symbols-outlined text-[14px] leading-none ${msg.leido_por_todos ? 'text-indigo-300' : ''}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                                                                done_all
                                                            </span>
                                                         )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {contextMenu && (
                                <div 
                                    className="fixed z-[100] w-40 lg:w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl lg:rounded-2xl shadow-2xl p-1 lg:p-2 animate-in fade-in zoom-in-95 duration-200"
                                    style={{ top: contextMenu.y, left: contextMenu.x }}
                                >
                                    <button 
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            handleDeleteMessage(contextMenu.messageId);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        <span className="text-[9px] lg:text-[10px] font-semibold tracking-wide">Eliminar</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 sticky bottom-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md p-3 lg:p-6 pt-0 z-30">
                            <form 
                                onSubmit={(e: React.FormEvent) => handleSend(e)} 
                                className="bg-white dark:bg-zinc-900 p-1.5 lg:p-3 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-1.5 lg:gap-3 transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 relative"
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="size-10 lg:size-12 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-all active:scale-90 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[20px] lg:text-[22px]">attach_file</span>
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                                    placeholder="Mensaje..."
                                    className="flex-1 bg-transparent border-none text-xs lg:text-sm font-bold dark:text-white outline-none focus:ring-0 px-2 lg:px-4 placeholder:text-zinc-400/60 min-w-0"
                                />
                                
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 p-3 lg:p-4 bg-white dark:bg-zinc-900 rounded-2xl lg:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xl flex gap-1 lg:gap-2 animate-in slide-in-from-bottom-2 duration-300 z-50 overflow-x-auto max-w-[90vw]">
                                        {emojis.map((emoji: string) => (
                                            <button 
                                                key={emoji} 
                                                type="button"
                                                onClick={() => setNewMessage((prev: string) => prev + emoji)}
                                                className="size-8 lg:size-10 rounded-lg lg:rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-lg lg:text-xl hover:scale-110 transition-transform shrink-0"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button 
                                    type="button" 
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`size-10 lg:size-12 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0 ${showEmojiPicker ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white' : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px] lg:text-[22px]">sentiment_satisfied</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="size-10 lg:size-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 dark:bg-indigo-500 text-white rounded-full flex items-center justify-center hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-0 disabled:scale-90 shadow-lg shadow-indigo-600/20 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[18px] lg:text-[20px]">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 text-center select-none relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 lg:w-[500px] h-64 lg:h-[500px] bg-indigo-500/5 rounded-full blur-[60px] lg:blur-[120px] pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="size-24 lg:size-40 bg-zinc-50 dark:bg-zinc-900 rounded-[2.5rem] lg:rounded-[4rem] flex items-center justify-center mb-6 lg:mb-8 shadow-inner border border-zinc-100 dark:border-zinc-800">
                                <span className="material-symbols-outlined text-4xl lg:text-7xl text-zinc-200 dark:text-zinc-800">chat_bubble_outline</span>
                            </div>
                            <h3 className="text-xl lg:text-2xl font-black dark:text-white tracking-tight">Centro de Mensajería</h3>
                            <p className="text-[8px] lg:text-[9px] font-semibold tracking-wide text-zinc-400 mt-4 max-w-xs leading-loose">Selecciona un canal para conversar.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSystem;
