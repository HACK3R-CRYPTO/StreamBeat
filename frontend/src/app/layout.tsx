"use client";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "@/context/WalletContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning={true}>
        <QueryClientProvider client={queryClient}>
          <ThirdwebProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
            <Toaster 
              position="top-center"
              toastOptions={{
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  borderRadius: '12px',
                },
                success: {
                  iconTheme: {
                    primary: '#FFD700',
                    secondary: '#000',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FF6B6B',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ThirdwebProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
