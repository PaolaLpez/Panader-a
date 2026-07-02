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

  useEffect(() => {
    const styleId = 'pinabot-custom-styles';
    if (!document.getElementById(styleId)) {
      const sheet = document.createElement('style');
      sheet.id = styleId;
      sheet.innerHTML = `
        @keyframes floatUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(180, 83, 9, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(180, 83, 9, 0); }
          100% { box-shadow: 0 0 0 0 rgba(180, 83, 9, 0); }
        }
        .pinabot-btn {
          animation: pulseGlow 2s infinite;
          transition: all 0.2s ease-in-out;
        }
        .pinabot-btn:hover {
          transform: scale(1.08) rotate(-5deg);
        }
      `;
      document.head.appendChild(sheet);
    }
  }, []);

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
        className="pinabot-btn"
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
          zIndex: 9999
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
          bottom: '24px',
          right: '24px',
          width: '370px',
          height: '500px',
          maxHeight: 'calc(100vh - 48px)',
          borderRadius: '16px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9999,
          animation: 'floatUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
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
            {/* Logo de avatar de la panadería */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#fff',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src="/logo_panapina.png" alt="PinaBot Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              flex: 1
            }}>
              <span style={{ color: '#fff', fontWeight: '750', fontSize: '14px', letterSpacing: '0.3px' }}>PinaBot 🤖</span>
              <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '8px' }}>●</span> En línea</span>
            </div>
            
            {/* Botón Circular de Cerrar Pestaña */}
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                color: '#fff'
              }}
              title="Cerrar chat"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            >
              <X size={16} color="#fff" />
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
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                    gap: '8px'
                  }}
                >
                  {/* Mini-Avatar de PinaBot al lado de sus mensajes */}
                  {msg.sender === 'bot' && (
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#fff',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img src="/logo_panapina.png" alt="PinaBot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div 
                    style={{
                      maxWidth: '75%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      textAlign: 'left',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
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
