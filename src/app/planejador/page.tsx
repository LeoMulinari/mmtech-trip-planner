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

// --- NOVA INTERFACE PARA OS DADOS DA ROTA ---
interface RotaData {
    trechos: {
        origem: string;
        destino: string;
        distancia: string;
        duracao: string;
    }[];
    distanciaTotal: number;
    duracaoTotal: number;
}

export default function PlanejadorPage() {
    // 1. Criamos um estado para armazenar a lista de destinos
    const [destinos, setDestinos] = useState<Destino[]>([]);

    // --- NOVOS ESTADOS PARA O FORMULÁRIO ---
    const [nome, setNome] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    // --- NOVOS ESTADOS PARA A ROTA ---
    const [rota, setRota] = useState<RotaData | null>(null);
    const [isLoadingRota, setIsLoadingRota] = useState(false);

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

     // --- USEEFFECT PARA CALCULAR A ROTA QUANDO A LISTA DE DESTINOS MUDA ---
    useEffect(() => {
        const calcularRota = async () => {
            if (destinos.length < 2) {
                setRota(null); // Limpa a rota se não houver trechos a calcular
                return;
            }

            setIsLoadingRota(true);
            try {
                const response = await fetch('/api/rota', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destinos }),
                });

                if (!response.ok) throw new Error('Falha ao calcular rota');

                const data: RotaData = await response.json();
                setRota(data);

            } catch (error) {
                console.error(error);
                setRota(null);
            } finally {
                setIsLoadingRota(false);
            }
        };

        calcularRota();
    }, [destinos]); // Dependência: Roda toda vez que 'destinos' mudar

     // --- FUNÇÕES AUXILIARES PARA FORMATAR TOTAIS ---
    const formatarDistancia = (metros: number) => `${(metros / 1000).toFixed(1)} km`;
    const formatarDuracao = (segundos: number) => {
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        return `${horas}h ${minutos}min`;
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

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
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

                {/* --- NOVA SEÇÃO PARA EXIBIR A ROTA --- */}
                <div>
                    <h2 className="text-2xl font-semibold">Detalhes da Rota:</h2>
                    {isLoadingRota && <p className="mt-4">Calculando rota...</p>}
                    {rota && rota.trechos.length > 0 && !isLoadingRota && (
                        <div className="mt-4 space-y-4">
                            {/* Detalhes de cada trecho */}
                            {rota.trechos.map((trecho, index) => (
                                <div key={index} className="p-2 border-b">
                                    <p><strong>De:</strong> {trecho.origem}</p>
                                    <p><strong>Para:</strong> {trecho.destino}</p>
                                    <p>Distância: {trecho.distancia} | Duração: {trecho.duracao}</p>
                                </div>
                            ))}
                            {/* Totais */}
                            <div className="mt-4 p-4 bg-gray-600 rounded-lg">
                                <p className="text-lg font-bold">Distância Total: {formatarDistancia(rota.distanciaTotal)}</p>
                                <p className="text-lg font-bold">Duração Total: {formatarDuracao(rota.duracaoTotal)}</p>
                            </div>
                        </div>
                    )}
                    {destinos.length < 2 && !isLoadingRota && (
                        <p className="mt-4 text-gray-500">Adicione pelo menos mais um destino para calcular a rota.</p>
                    )}
                </div>
            </div>
        </main>
    );
}