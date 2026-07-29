import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageSquare, X, ShieldAlert, RefreshCw, User, Lock, Paperclip } from 'lucide-react';

export default function MaintenanceChatDrawer({ request, onClose }) {
  const { user, apiCall } = useAuth();
  const { socket, isConnected } = useSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Historical Messages via REST Endpoint
  const fetchMessages = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiCall(`/api/v1/maintenance/${request._id}/messages`);
      if (res.success) {
        setMessages(res.data);
      } else {
        setErrorMsg(res.message || 'Failed to load chat history');
      }
    } catch (err) {
      console.error('Chat history fetch error:', err.message);
      setErrorMsg('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  // 2. Setup Socket Room Join & WebSocket Message Listeners
  useEffect(() => {
    if (!request?._id) return;

    fetchMessages();

    if (socket && isConnected) {
      const requestId = request._id;

      // Join chat room on server
      socket.emit('chat:join', { requestId });

      // Handle incoming live chat messages
      const handleChatMessage = (newMsg) => {
        if (newMsg.requestId === requestId) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
        }
      };

      // Handle server-side chat errors
      const handleChatError = (err) => {
        if (err.requestId === requestId || !err.requestId) {
          console.warn('⚠️ Chat Socket Error:', err.message);
          setErrorMsg(err.message);
        }
      };

      // Re-join chat room automatically on socket reconnection
      const handleReconnect = () => {
        console.log('⚡ Socket reconnected - Re-joining chat room:', requestId);
        socket.emit('chat:join', { requestId });
      };

      socket.on('chat:message', handleChatMessage);
      socket.on('chat:error', handleChatError);
      socket.on('connect', handleReconnect);

      return () => {
        socket.off('chat:message', handleChatMessage);
        socket.off('chat:error', handleChatError);
        socket.off('connect', handleReconnect);
      };
    }
  }, [request?._id, socket, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Send Message Handler
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !isConnected) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    socket.emit('chat:message', {
      requestId: request._id,
      message: messageText,
    });

    setIsSending(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 font-sans">
        
        {/* Widescreen Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {request.assetId?.name || 'Asset Ticket Discussion'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Asset Code: <strong className="text-slate-700 font-mono">{request.assetId?.assetCode || 'N/A'}</strong> • Priority: <span className="uppercase font-bold text-amber-600">{request.priority}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Connection Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'LIVE SOCKET' : 'RECONNECTING'}
            </span>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              title="Close Chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error Alert Bar if permission error occurs */}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-center gap-2 text-red-700 text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-slate-50/50 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400 gap-2">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading ticket message history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 text-slate-400 space-y-3 select-none">
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                <MessageSquare className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-slate-700">No chat messages yet</p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Start the discussion for this maintenance ticket. Messages are synchronized in real-time across staff and employees.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const currentUserIdStr = (user?._id || user?.id || '').toString();
              const currentUserEmail = (user?.email || '').toLowerCase().trim();

              const senderIdStr = (msg.senderId?._id || msg.senderId || '').toString();
              const senderNameStr = (msg.senderName || '').toLowerCase().trim();

              const isMe = Boolean(
                (currentUserIdStr && senderIdStr && currentUserIdStr === senderIdStr) ||
                (currentUserEmail && (senderNameStr === currentUserEmail || senderNameStr === currentUserEmail.split('@')[0]))
              );

              return (
                <div
                  key={msg._id || Math.random()}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-center gap-1.5 mb-1.5 px-1 text-xs text-slate-400 font-semibold ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-slate-800">{isMe ? 'You' : msg.senderName}</span>
                    <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md uppercase font-bold">
                      {msg.senderRole?.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span className="text-[11px]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm font-medium leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-blue-600/10'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={handleSendMessage} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-2 flex items-center gap-3 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all shadow-xs">
            <button type="button" className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer rounded-xl transition-colors" title="Attach file">
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isConnected ? "Message team about this ticket..." : "Connecting to chat..."}
              disabled={!isConnected || loading}
              className="flex-1 bg-transparent border-0 py-2 px-1 text-sm text-slate-800 focus:outline-none placeholder-slate-400 font-medium disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || !isConnected || isSending}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 text-white rounded-xl cursor-pointer transition-all active:scale-95 disabled:cursor-not-allowed shadow-md shadow-blue-600/15 shrink-0"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
