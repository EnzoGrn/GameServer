"use client";

import { createContext, useContext, useState, } from 'react';
import { Message } from './messageType';

const ChatContext = createContext<{
  messages: Message[];
  newMessage: (message: Message) => void;
}>({
  messages: [],
  newMessage: (message: Message) => {},
});

export const MessagesProvider = ({ children }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const newMessage = (message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }

  return (
    <ChatContext.Provider value={{ messages, newMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useMessages = () => {
  return useContext(ChatContext);
};
