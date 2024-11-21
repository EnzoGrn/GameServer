"use client";

// --- Librairies --- //
import React, { createContext, useContext, useEffect, useState, } from 'react';

// --- Interfaces --- //
import io, { Socket } from "socket.io-client";

// --- Constants --- //

const socketContext = createContext<{
    socket: Socket | null;
    setSocket: (socket: Socket | null) => void;
}>({
    socket: null,
    setSocket: () => {}
});

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";

export const SocketProvider = ({ children }: any) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        setSocket(io(SERVER_URL));
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
