import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageSquare, X, ShieldAlert, RefreshCw, User, Lock } from 'lucide-react';

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

  // 1. Fetch Historical Messages via REST Endpoint (Day 3)
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

  // 2. Setup Socket Room Join & WebSocket Message Listeners (Day 4, 5, 6)
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
            // Avoid duplicate message appending if already added
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
        }
      };

      // Handle server-side chat errors (e.g. permission rejection)
      const handleChatError = (err) => {
        if (err.requestId === requestId || !err.requestId) {
          console.warn('⚠️ Chat Socket Error:', err.message);
          setErrorMsg(err.message);
        }
      };

      // Day 6 Edge Case: Re-join chat room automatically on socket reconnection
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Ticket Chat</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {request.assetId?.name || 'Asset Ticket'} • Priority: <span className="uppercase font-bold">{request.priority}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time Connection Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'LIVE' : 'RECONNECTING'}
            </span>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error Alert Bar if permission error occurs */}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center gap-2 text-red-700 text-xs font-medium">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400 gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading ticket message history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-slate-400 space-y-2 select-none">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">No chat messages yet</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Start the discussion for this ticket. Messages are synchronized in real-time across staff and assigned employees.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user._id || msg.senderId?._id === user._id;
              return (
                <div
                  key={msg._id || Math.random()}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-semibold">
                    <span>{msg.senderName}</span>
                    <span className="text-[9px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md uppercase font-bold">
                      {msg.senderRole?.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-bl-xs'
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
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Connecting to chat..."}
            disabled={!isConnected || loading}
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium text-slate-800 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected || isSending}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl cursor-pointer transition-all active:scale-95 disabled:cursor-not-allowed shadow-md shadow-blue-600/10 shrink-0"
            title="Send Message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
