import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export const ChatboxWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '¡Hola! 🍞 Soy **PinaBot**, tu asistente virtual en PanaPina. ¿En qué te puedo ayudar hoy?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll al fondo al recibir mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Agregar mensaje del usuario
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');

    // Activar animación de escribiendo
    setIsTyping(true);

    try {
      // Consumir la API real
      const res = await api.chat.send(text);
      if (res.success) {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: res.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (error) {
      console.warn('Backend offline, conectando con la API pública externa (AdviceSlip)...');
      try {
        const response = await fetch('https://api.adviceslip.com/advice');
        const data = await response.json();
        
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `🤖 **[PinaBot - Modo API Externa]**\n\nEl servidor local está desconectado. He consultado la API pública externa **AdviceSlip** y obtuve este consejo útil:\n\n*"${data.slip.advice}"*`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } catch (externalError) {
        console.error('Error en API externa:', externalError);
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Lo siento, no se pudo establecer conexión con el backend local ni con la API externa de respaldo. Asegúrate de tener conexión a Internet.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Botón flotante para abrir el chat */}
      <button 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 8px 24px rgba(180, 83, 9, 0.4)',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'all 0.2s ease'
        }}
        onClick={() => setIsOpen(true)}
        title="PinaBot - Asistente Virtual"
      >
        <MessageSquare size={24} color="#fff" />
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          backgroundColor: 'var(--secondary)',
          color: '#fff',
          fontSize: '9px',
          fontWeight: '700',
          padding: '3px 6px',
          borderRadius: '8px',
          textTransform: 'uppercase',
          border: '2px solid var(--background)'
        }}>Bot</span>
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          width: '360px',
          height: '520px',
          borderRadius: '16px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9999
        }}>
          {/* Cabecera del Chat */}
          <div style={{
            backgroundColor: 'var(--secondary)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              flex: 1
            }}>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>PinaBot 🤖</span>
              <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '8px' }}>●</span> En línea</span>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => setIsOpen(false)}>
              <X size={18} color="var(--text-muted)" />
            </button>
          </div>

          {/* Cuerpo del Chat (Mensajes) */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            backgroundColor: 'var(--background)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div 
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      textAlign: 'left',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      ...(msg.sender === 'user' ? {
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary-hover)',
                        borderRadius: '12px 12px 0 12px',
                        fontWeight: '500'
                      } : {
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        borderRadius: '12px 12px 12px 0',
                        border: '1px solid var(--border)'
                      })
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {msg.text.split('\n').map((line, idx) => {
                        // Resaltar negritas
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        const match = boldRegex.exec(line);
                        if (match) {
                          const parts = line.split(/\*\*(.*?)\*\*/g);
                          return (
                            <p key={idx} style={{ margin: '0 0 6px 0' }}>
                              {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx}>{part}</strong> : part)}
                            </p>
                          );
                        }

                        // Formatear enlaces
                        const linkRegex = /\[(.*?)\]\((.*?)\)/g;
                        if (linkRegex.test(line)) {
                          const parts = line.split(/\[(.*?)\]\((.*?)\)/g);
                          return (
                            <p key={idx} style={{ margin: '0 0 6px 0' }}>
                              {parts.map((part, pIdx) => {
                                if (pIdx % 3 === 1) {
                                  return (
                                    <a 
                                      key={pIdx} 
                                      href={parts[pIdx + 1]} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'underline' }}
                                    >
                                      {part}
                                    </a>
                                  );
                                }
                                if (pIdx % 3 === 2) return null;
                                return part;
                              })}
                            </p>
                          );
                        }

                        return <p key={idx} style={{ margin: '0 0 6px 0' }}>{line}</p>;
                      })}
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '4px', textAlign: 'right' }}>{msg.time}</span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start' }}>
                  <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderRadius: '12px 12px 12px 0', border: '1px solid var(--border)', display: 'flex', gap: '4px', padding: '12px 16px' }}>
                    <span className="dot" style={{ color: 'var(--primary)', animation: 'blink 1.4s infinite both', fontSize: '10px' }}>●</span>
                    <span className="dot" style={{ color: 'var(--primary)', animation: 'blink 1.4s infinite both', fontSize: '10px', animationDelay: '0.2s' }}>●</span>
                    <span className="dot" style={{ color: 'var(--primary)', animation: 'blink 1.4s infinite both', fontSize: '10px', animationDelay: '0.4s' }}>●</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Sugerencias */}
          <div style={{
            padding: '8px 12px',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            backgroundColor: 'var(--background)',
            borderTop: '1px solid var(--border)',
            whiteSpace: 'nowrap'
          }}>
            <button 
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer' }}
              onClick={() => handleSendMessage('¿Cómo hacer un corte de caja?')}
            >
              📊 Corte de caja
            </button>
            <button 
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer' }}
              onClick={() => handleSendMessage('¿Cómo registrar un retiro?')}
            >
              💸 Salida de efectivo
            </button>
            <button 
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer' }}
              onClick={() => handleSendMessage('¿Cuáles son los nuevos panes?')}
            >
              🥐 Nuevos panes
            </button>
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--card-bg)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px'
          }}>
            <input 
              type="text" 
              placeholder="Pregunta sobre la caja, panes, etc..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0
              }} 
              onClick={() => handleSendMessage(null)}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
