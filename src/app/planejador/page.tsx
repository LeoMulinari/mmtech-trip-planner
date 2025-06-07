// Em: src/app/planejador/page.tsx
'use client';

import { useEffect, useState } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from 'use-places-autocomplete';

// --- NOVAS IMPORTAÇÕES DO DND-KIT ---
import { SortableItem } from '@/components/SortableItem';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// --- INTERFACES ---
interface Destino {
    _id?: string;
    nome: string;
    latitude: number;
    longitude: number;
    ordem: number;
    createdAt: Date;
}

interface RotaData {
    trechos: {
        origem: string;
        destino: string;
        distancia: string;
        duracao: string;
        tipo: 'CARRO' | 'VOO_OU_LONGA_DISTANCIA';
    }[];
    distanciaTotal: number;
    duracaoTotal: number;
}

interface SelectedPlace {
    nome: string;
    lat: number;
    lng: number;
}

// --- FUNÇÃO DE FORMATAÇÃO FINAL ---
const formatarNomeDestino = (
    suggestion: google.maps.places.AutocompletePrediction,
    geocodedResult: google.maps.GeocoderResult
): string => {
    const { structured_formatting } = suggestion;
    const { address_components } = geocodedResult;

    // Função auxiliar para encontrar um componente
    const get = (type: string, useShortName = false) => {
        const component = address_components.find(c => c.types.includes(type));
        return component ? (useShortName ? component.short_name : component.long_name) : '';
    };

    // 1. Pega o nome principal da forma mais confiável
    let nomePrincipal = structured_formatting.main_text;

    // Caso especial para endereços de rua, monta "Rua, Número"
    if (geocodedResult.types.includes('street_address')) {
        const rua = get('route');
        const numero = get('street_number');
        if (rua) {
            nomePrincipal = numero ? `${rua}, ${numero}` : rua;
        }
    }

    // 2. Pega todas as outras partes do contexto
    const cidade = get('locality') || get('administrative_area_level_2');
    const estado = get('administrative_area_level_1', true); // Pega o nome curto (PR)
    const pais = get('country');

    // 3. Montagem inteligente usando um Set para evitar duplicatas
    // Um Set só permite valores únicos, então se "Ponta Grossa" aparecer duas vezes, ele só guarda uma.
    const partes = new Set<string>();

    partes.add(nomePrincipal);
    partes.add(cidade);
    partes.add(estado);
    partes.add(pais);

    // Converte o Set de volta para um array, remove qualquer parte vazia, e junta com ", "
    return Array.from(partes).filter(Boolean).join(', ');
};

export default function PlanejadorPage() {
    const [destinos, setDestinos] = useState<Destino[]>([]);
    const [rota, setRota] = useState<RotaData | null>(null);
    const [isLoadingRota, setIsLoadingRota] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({ requestOptions: {}, debounce: 300 });

    // --- SENSORES PARA O DND-KIT ---
    // Permite o drag and drop com o mouse e com o teclado (para acessibilidade)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // --- NOVA FUNÇÃO onDragEnd ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setDestinos((items) => {
                const oldIndex = items.findIndex((item) => item._id === active.id);
                const newIndex = items.findIndex((item) => item._id === over.id);
                
                // Função auxiliar da dnd-kit que reordena o array para nós
                const reorderedItems = arrayMove(items, oldIndex, newIndex);
                
                // Atualiza a propriedade 'ordem' de cada item
                const updatedDestinos = reorderedItems.map((item, index) => ({
                    ...item,
                    ordem: index + 1,
                }));

                // Avisa o backend para salvar a nova ordem
                updateOrdemNoBackend(updatedDestinos);

                return updatedDestinos;
            });
        }
    };
    
    // --- SUA FUNÇÃO PARA FALAR COM O BACKEND (NÃO MUDA NADA!) ---
    const updateOrdemNoBackend = async (novosDestinos: Destino[]) => {
        try {
            await fetch('/api/destinos/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destinos: novosDestinos }),
            });
        } catch (error) {
            console.error("Erro ao salvar a nova ordem:", error);
            // Opcional: aqui você poderia mostrar um alerta de erro para o usuário
            // e reverter a lista para o estado anterior para manter a consistência.
        }
    };

    const fetchDestinos = async () => {
        try {
            const response = await fetch('/api/destinos');
            if (!response.ok) throw new Error('Erro ao buscar destinos');
            const data: Destino[] = await response.json();
            setDestinos(data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchDestinos(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este destino?')) return;
        try {
            const response = await fetch(`/api/destinos/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Erro ao excluir destino');
            await fetchDestinos();
        } catch (error) { console.error(error); }
    };
    
    useEffect(() => {
        const calcularRota = async () => {
            if (destinos.length < 2) { setRota(null); return; }
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
            } catch (error) { console.error(error); setRota(null); } 
            finally { setIsLoadingRota(false); }
        };
        calcularRota();
    }, [destinos]);

    const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
        const { place_id } = suggestion;
        setValue(suggestion.description, false);
        clearSuggestions();
        try {
            const results = await getGeocode({ placeId: place_id });
            const { lat, lng } = await getLatLng(results[0]);
            
            // Passamos a SUGESTÃO e o RESULTADO para a nossa nova função
            const nomeFormatado = formatarNomeDestino(suggestion, results[0]);
            
            setSelectedPlace({ nome: nomeFormatado, lat, lng });
        } catch (error) { console.error("Erro ao obter coordenadas: ", error); }
    };

    const handleAddClick = () => {
        if (!selectedPlace) return;
        adicionarDestino(selectedPlace.nome, selectedPlace.lat, selectedPlace.lng);
        setValue("");
        setSelectedPlace(null);
    };

    const adicionarDestino = async (nome: string, latitude: number, longitude: number) => {
        try {
            const response = await fetch('/api/destinos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, latitude, longitude }),
            });
            if (!response.ok) throw new Error('Erro ao adicionar destino');
            await fetchDestinos();
        } catch (error) { console.error(error); }
    };

    const formatarDistancia = (metros: number) => `${(metros / 1000).toFixed(1)} km`;
    const formatarDuracao = (segundos: number) => {
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        return `${horas}h ${minutos}min`;
    };

    return (
        <main className="container mx-auto p-8">
            <h1 className="text-4xl font-bold mb-6">Planejador de Viagem</h1>
            <div className="p-4 border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Adicionar Novo Destino</h3>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input type="text" placeholder="Digite o nome de uma cidade..." value={value} onChange={(e) => { setValue(e.target.value); setSelectedPlace(null); }} disabled={!ready} className="p-2 border rounded w-full" />
                        {status === "OK" && (
                            <ul className="absolute z-10 w-full bg-black border rounded mt-1">
                                {data.map((suggestion) => (
                                    <li key={suggestion.place_id} onClick={() => handleSelect(suggestion)} className="p-2 hover:bg-gray-600 cursor-pointer">{suggestion.description}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={handleAddClick} disabled={!selectedPlace} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">Adicionar</button>
                </div>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-semibold">Seu Roteiro:</h2>
                    
                    {/* --- ATUALIZAÇÃO NA LISTA PARA USAR DND-KIT --- */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            // Passamos um array de IDs para o contexto
                            items={destinos.map(d => d._id!)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ul className="list-inside mt-4 space-y-2">
                                {destinos.map((destino) => (
                                    <SortableItem key={destino._id} id={destino._id!}>
                                        {/* O conteúdo visual do item da lista fica aqui dentro */}
                                        <div
                                            className="text-lg flex items-center justify-between p-2 rounded bg-gray-700 hover:bg-gray-600 cursor-grab"
                                            title={destino.nome}
                                        >
                                            <span>{destino.ordem}. {destino.nome}</span>
                                            <button onClick={() => handleDelete(destino._id!)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Excluir</button>
                                        </div>
                                    </SortableItem>
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                </div>
                <div>
                    <h2 className="text-2xl font-semibold">Detalhes da Rota:</h2>
                    {isLoadingRota && <p className="mt-4">Calculando rota...</p>}
                    {rota && rota.trechos.length > 0 && !isLoadingRota && (
                        <div className="mt-4 space-y-4">
                            {rota.trechos.map((trecho, index) => (
                                <div key={index} className="p-2 border-b">
                                    <p><strong>De:</strong> {trecho.origem.split(',')[0]}</p>
                                    <p><strong>Para:</strong> {trecho.destino.split(',')[0]}</p>
                                    {/* Renderização Condicional Baseada no Tipo */}
                                    {trecho.tipo === 'CARRO' ? (
                                        <p>Distância: {trecho.distancia} | Duração: {trecho.duracao}</p>
                                    ) : (
                                        <p className="text-blue-500 font-semibold">✈️ Rota intercontinental ou muito longa.</p>
                                    )}
                                </div>
                            ))}
                            
                            {/* --- CONDIÇÃO CORRIGIDA AQUI --- */}
                            {rota && rota.distanciaTotal > 0 && (
                                <div className="mt-4 p-4 bg-gray-600 rounded-lg">
                                    {/* Mudei o título para ser mais claro para o usuário */}
                                    <p className="text-lg font-bold">Resumo da Viagem (Apenas Trechos Terrestres):</p>
                                    <p className="mt-2">Distância Total Calculada: {formatarDistancia(rota.distanciaTotal)}</p>
                                    <p>Duração Total Calculada: {formatarDuracao(rota.duracaoTotal)}</p>
                                </div>
                            )}
                        </div>      
                    )}
                    {destinos.length < 2 && !isLoadingRota && (<p className="mt-4 text-gray-500">Adicione pelo menos mais um destino para calcular a rota.</p>)}
                </div>
            </div>
        </main>
    );
}