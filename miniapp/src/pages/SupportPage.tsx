import { useState, useEffect, useRef } from 'react';
import { Typography, Input, Spinner } from '@maxhub/max-ui';
import api from '../api/client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я здесь, чтобы поддержать тебя. Понимаю, что учеба и жизнь студента могут быть непростыми. Расскажи, что у тебя на душе? Я слушаю.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Отправляем всю историю сообщений (включая новое сообщение пользователя)
      const messagesForApi = [...messages, userMessage].map(msg => ({
        text: msg.text,
        sender: msg.sender
      }));

      const response = await api.sendChatMessage(messagesForApi);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Ошибка отправки сообщения:', err);
      setError('Не удалось отправить сообщение. Попробуйте еще раз.');
      
      // Показываем сообщение об ошибке пользователю
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Извините, произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте еще раз или обратитесь в поддержку позже.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        minHeight: 0
      }}
    >
      {/* Область сообщений */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          paddingBottom: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: 0
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {/* Сообщение */}
              <div
                style={{
                  backgroundColor: message.sender === 'user' ? '#2980F2' : '#EFEFEF',
                  color: message.sender === 'user' ? '#FFFFFF' : '#000000',
                  padding: '12px 16px',
                  borderRadius: message.sender === 'user' 
                    ? '16px 16px 4px 16px' 
                    : '16px 16px 16px 4px',
                  fontSize: 15,
                  lineHeight: 1.4,
                  wordWrap: 'break-word',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography.Body 
                  variant="small" 
                  style={{
                    color: message.sender === 'user' ? '#FFFFFF' : '#000000',
                    fontSize: 15,
                    lineHeight: 1.4,
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {message.text}
                </Typography.Body>
              </div>
              
              {/* Время */}
              <Typography.Body 
                variant="small" 
                style={{
                  fontSize: 11,
                  color: '#999999',
                  padding: '0 4px'
                }}
              >
                {formatTime(message.timestamp)}
              </Typography.Body>
            </div>
          </div>
        ))}

        {/* Индикатор загрузки */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              width: '100%'
            }}
          >
            <div
              style={{
                backgroundColor: '#EFEFEF',
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Spinner size={16} />
              <Typography.Body 
                variant="small" 
                style={{
                  fontSize: 13,
                  color: '#666666',
                  margin: 0
                }}
              >
                Печатает...
              </Typography.Body>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #EFEFEF',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите ваш вопрос..."
          style={{
            flex: 1,
            fontSize: 15,
            padding: '12px 18px',
            borderRadius: '24px',
            border: '1px solid #E0E0E0',
            backgroundColor: '#F8F8F8',
            minHeight: '48px',
            maxHeight: '120px',
            lineHeight: '1.4',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          disabled={isLoading}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2980F2';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E0E0E0';
            e.currentTarget.style.backgroundColor = '#F8F8F8';
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          style={{
            minWidth: '72px',
            width: '72px',
            height: '48px',
            borderRadius: '24px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: inputValue.trim() && !isLoading ? '#2980F2' : '#E0E0E0',
            border: 'none',
            cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: inputValue.trim() && !isLoading 
              ? '0 2px 8px rgba(41, 128, 242, 0.3)' 
              : 'none',
            transform: inputValue.trim() && !isLoading ? 'scale(1)' : 'scale(0.95)'
          }}
          onMouseEnter={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = '#1E6DD0';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(41, 128, 242, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = '#2980F2';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(41, 128, 242, 0.3)';
            }
          }}
          onMouseDown={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
        >
          <svg 
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transition: 'transform 0.2s ease'
            }}
          >
            <path 
              d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SupportPage;
