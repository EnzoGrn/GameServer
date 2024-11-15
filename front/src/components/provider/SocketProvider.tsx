"use client";

// --- Librairies --- //
import React, { createContext, useContext, useEffect, useState, } from 'react';

// --- Interfaces --- //
import io, { Socket } from "socket.io-client";

const socketContext = createContext<{
    socket: Socket | null;
    setSocket: (socket: Socket | null) => void;
}>({
    socket: null,
    setSocket: () => {}
});

export const SocketProvider = ({ children }: any) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        setSocket(io('http://localhost:3001'));
    }, []);

    return (
        <socketContext.Provider value={{ socket, setSocket }}>
            {children}
        </socketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(socketContext);
};
