// Em: src/app/layout.tsx
'use client';
import { useLoadScript } from "@react-google-maps/api";
import { Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter'});



// O tipo Libraries é necessário para o hook useLoadScript
const libraries: "places"[] = ["places"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!,
    libraries,
    //language: 'en', // Força o idioma para inglês (ajuda na neutralidade)
    //region: 'US',   // Força a região para os EUA (um padrão neutro comum)
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

  // Quando tudo está carregado, renderiza a estrutura com os filhos (sua página)
  return (
    <html lang="pt-br">
      <body className={inter.className}>
        {/* Adicione o Toaster aqui. Ele gerencia todas as notificações. */}
        <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
                // --- OPÇÕES ATUALIZADAS ---
                duration: 5000, // Toasts duram 5 segundos
                style: {
                    background: '#1e293b',    // bg-slate-800
                    color: '#e2e8f0',         // text-slate-200
                    border: '1px solid #334155', // border-slate-700
                    padding: '16px', // Mais espaçamento interno
                    fontSize: '16px', // Fonte maior
                },
                // Estilos específicos para cada tipo de toast
                success: {
                    icon: <FaCheckCircle className="text-green-500" />,
                    style: {
                        borderColor: '#22c55e', // Borda verde para sucesso
                    },
                },
                error: {
                    icon: <FaTimesCircle className="text-red-500" />,
                    style: {
                        borderColor: '#ef4444', // Borda vermelha para erro
                    },
                },
            }}
        /> 
        {children}
      </body>
    </html>
  );
}