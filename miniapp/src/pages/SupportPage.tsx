import { useState, useEffect, useRef } from 'react';
import { Typography, Input, Spinner } from '@maxhub/max-ui';

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
      text: 'Привет! Я виртуальный помощник поддержки. Чем могу помочь?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

    // Имитация ответа ИИ (замените на реальный API вызов)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Спасибо за ваш вопрос! В данный момент я обрабатываю запрос. Это демо-версия, и вскоре здесь будет работать полноценный ИИ-ассистент.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
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
          gap: '8px',
          alignItems: 'flex-end'
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
            padding: '12px 16px',
            borderRadius: '20px',
            border: '1px solid #EFEFEF',
            backgroundColor: '#F5F5F5',
            minHeight: '44px'
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          style={{
            minWidth: '44px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: inputValue.trim() && !isLoading ? '#2980F2' : '#CCCCCC',
            border: 'none',
            cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = '#1E6DD0';
            }
          }}
          onMouseLeave={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = '#2980F2';
            }
          }}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" 
              stroke="white" 
              strokeWidth="2" 
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
