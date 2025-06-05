// IMPORTANTE! Adicione esta linha no topo.
// Ela diz ao Next.js que este é um "Componente de Cliente",
// o que nos permite usar hooks como useState e useEffect para interatividade.
'use client';

import { FormEvent, useEffect, useState } from 'react';

// Precisamos definir a "forma" de um destino aqui também,
// para que o TypeScript saiba com que tipo de dados estamos lidando no frontend.
interface Destino {
    _id?: string;
    nome: string;
    latitude: number;
    longitude: number;
    ordem: number;
    descricao?: string;
    imageUrl?: string;
    createdAt: Date;
}

export default function PlanejadorPage() {
    // 1. Criamos um estado para armazenar a lista de destinos
    const [destinos, setDestinos] = useState<Destino[]>([]);

    // --- NOVOS ESTADOS PARA O FORMULÁRIO ---
    const [nome, setNome] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    // 2. Função para buscar os dados da nossa API
    const fetchDestinos = async () => {
        try {
            const response = await fetch('/api/destinos');
            if (!response.ok) {
                throw new Error('Erro ao buscar destinos');
            }
            const data: Destino[] = await response.json();
            setDestinos(data);
        } catch (error) {
            console.error(error);
        }
    };

    // 3. useEffect para chamar a função de busca quando a página carrega
    // O array vazio [] como segundo argumento faz com que ele rode apenas uma vez.
    useEffect(() => {
        fetchDestinos();
    }, []);

    // --- NOVA FUNÇÃO PARA LIDAR COM O SUBMIT DO FORMULÁRIO ---
    const handleSubmit = async (event: FormEvent) => {
        // Previne o comportamento padrão do formulário de recarregar a página
        event.preventDefault();

        try {
            const response = await fetch('/api/destinos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome,
                    // Convertemos para número antes de enviar
                    latitude: parseFloat(latitude), 
                    longitude: parseFloat(longitude),
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao adicionar destino');
            }

            // Limpa os campos do formulário
            setNome('');
            setLatitude('');
            setLongitude('');
            
            // Re-busca a lista de destinos para atualizar a tela com o novo item
            await fetchDestinos();

        } catch (error) {
            console.error(error);
        }
    };

    // --- NOVA FUNÇÃO PARA DELETAR UM DESTINO ---
    const handleDelete = async (id: string) => {
        // Confirmação opcional, mas uma boa prática de UX
        if (!confirm('Tem certeza que deseja excluir este destino?')) {
            return;
        }

        try {
            const response = await fetch(`/api/destinos/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir destino');
            }

            // Após deletar com sucesso, buscamos a lista atualizada e reordenada do backend
            await fetchDestinos();

        } catch (error) {
            console.error(error);
        }
    };
    
    return (
        <main className="container mx-auto p-8">
            <h1 className="text-4xl font-bold mb-6">Planejador de Viagem</h1>

            {/* --- SEÇÃO DO FORMULÁRIO --- */}
            <form onSubmit={handleSubmit} className="p-4 border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Adicionar Novo Destino</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Nome do Destino"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="p-2 border rounded"
                        required
                    />
                    <input
                        type="number"
                        step="any" // Permite decimais
                        placeholder="Latitude"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="p-2 border rounded"
                        required
                    />
                    <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="p-2 border rounded"
                        required
                    />
                </div>
                <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Adicionar
                </button>
            </form>

             <div className="mt-8">
                <h2 className="text-2xl font-semibold">Seu Roteiro:</h2>
                <ul className="list-inside mt-4 space-y-2"> {/* Adicionei space-y-2 para espaçamento */}
                    {destinos.map((destino) => (
                        <li 
                            key={destino._id} 
                            // Usei flexbox para alinhar os itens
                            className="text-lg flex items-center justify-between p-2 rounded hover:bg-gray-600"
                        >
                            <span>{destino.ordem}. {destino.nome}</span>
                            
                            {/* --- NOVO BOTÃO DE EXCLUIR --- */}
                            <button
                                // É crucial passar o `destino._id` para a função saber qual item deletar
                                // O '!' é para dizer ao TypeScript que temos certeza que o _id não será undefined
                                onClick={() => handleDelete(destino._id!)} 
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                                Excluir
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </main>
    );
}