import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

const App = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fetchingMessages, setIsFetchingMessages] = useState(false);
  const threadId = useRef('');
  const lastMessageRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (messages.length && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    async function fetchThreadMessages() {
      setIsFetchingMessages(true);
      setError(null);
      try {
        const { data } = await axios.get(`http://localhost:8000/chat/${threadId.current}`);
        setMessages(data?.messages ?? []);
      } catch (error) {
        console.error(error);
        setMessages([]);
        setError('Failed to load conversation.');
      } finally {
        setIsFetchingMessages(false);
      }
    }
    const existingThreadId = localStorage.getItem('threadId');
    if (existingThreadId) {
      threadId.current = existingThreadId;
      // Fetch thread messages
      fetchThreadMessages();
      return;
    }
    threadId.current = uuid();
    localStorage.setItem('threadId', threadId.current);
  }, []);

  const handleSend = async () => {
    if (inputMessage.trim().length === 0) return;
    // Clear input
    setInputMessage('');
    setIsGenerating(true);

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: inputMessage,
      },
    ]);
    // Send message to LLM

    try {
      const { data } = await axios.post('http://localhost:8000/chat', {
        message: inputMessage,
        threadId: threadId.current,
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: data.message,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='container mx-auto max-w-3xl pb-44 px-2'>
      {/* Messages */}
      {error && <div className='text-red-700'>{error}</div>}
      {fetchingMessages && !error && <div className='my-2 animate-pulse'>Loading conversation...</div>}
      {!fetchingMessages &&
        !error &&
        messages.map((message, index) => (
          <div
            className={message.role === 'user' ? 'my-6 bg-neutral-800 p-3 rounded-xl ml-auto w-fit' : 'max-w-fit'}
            key={`${message.role}-${index}`}
            ref={index === messages.length - 1 ? lastMessageRef : null}>
            {message.content}
          </div>
        ))}
      {isGenerating && <div className='animate-pulse'>Thinking...</div>}

      {/* ChatInput */}
      <div className='fixed inset-x-0 bottom-0 flex justify-center bg-neutral-900'>
        <div className='bg-neutral-800 p-2 rounded-3xl w-full max-w-3xl mb-3'>
          <textarea
            className='w-full resize-none outline-0 p-3'
            rows={2}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            value={inputMessage}></textarea>
          <div className='flex justify-end items-center'>
            <button
              className='bg-white px-4 py-1 text-black rounded-full cursor-pointer disabled:bg-gray-400 hover:bg-gray-300'
              onClick={handleSend}
              disabled={inputMessage.trim().length === 0 || isGenerating}>
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default App;
