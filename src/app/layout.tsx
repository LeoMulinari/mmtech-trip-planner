// Em: src/app/layout.tsx
'use client';
import { useLoadScript } from "@react-google-maps/api";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
         <body className={`${inter.className} bg-slate-900 text-slate-300`}>
          <p>Carregando...</p>
        </body>
      </html>
    );
  }

  // Quando tudo está carregado, renderiza a estrutura com os filhos (sua página)
  return (
    <html lang="pt-br">
       <body className={`${inter.className} bg-slate-600 text-slate-300`}>{children}</body>
    </html>
  );
}