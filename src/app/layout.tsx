'use client';
import { useLoadScript } from "@react-google-maps/api";
import { Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter'});
const libraries: "places"[] = ["places"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!,
    libraries,
  });

  // Em caso de erro, renderiza a estrutura completa com a mensagem de erro
  if (loadError) {
    return (
      <html lang="pt-br">
        <body className={inter.className}>
          <p>Erro ao carregar os serviços do Google Maps.</p>
        </body>
      </html>
    );
  }

  // Durante o carregamento, renderiza a estrutura completa com a mensagem de carregando
  if (!isLoaded) {
    return (
      <html lang="pt-br">
        <body className={inter.className}>
          <p>Carregando...</p>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-br">
      <body className={inter.className}>
        <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
                duration: 5000, 
                style: {
                    background: '#1e293b',    
                    color: '#e2e8f0',        
                    border: '1px solid #334155', 
                    padding: '16px', 
                    fontSize: '16px', 
                },
                // Estilos específicos para cada tipo de toast
                success: {
                    icon: <FaCheckCircle className="text-green-500" />,
                    style: {
                        borderColor: '#22c55e', 
                    },
                },
                error: {
                    icon: <FaTimesCircle className="text-red-500" />,
                    style: {
                        borderColor: '#ef4444', 
                    },
                },
            }}
        /> 
        {children}
      </body>
    </html>
  );
}