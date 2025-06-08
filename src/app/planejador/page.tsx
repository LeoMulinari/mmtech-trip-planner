// Em: src/app/planejador/page.tsx
'use client';

import { useEffect, useState } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from 'use-places-autocomplete';


// --- NOVAS IMPORTAÇÕES DO DND-KIT ---
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoogleMap, MarkerF } from '@react-google-maps/api';

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

     // --- ESTADO PARA O CENTRO DO MAPA ---
    // Começa centrado no Brasil
    const [mapCenter, setMapCenter] = useState({ lat: -14.235, lng: -51.925 });
    const [mapZoom, setMapZoom] = useState(4);

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
        // Esta função deve voltar a funcionar normalmente agora
        if (!confirm('Tem certeza que deseja excluir este destino?')) return;
        try {
            await fetch(`/api/destinos/${id}`, { method: 'DELETE' });
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

            // Atualizamos o centro do mapa para as coordenadas do local selecionado
            setMapCenter({ lat, lng });
            setMapZoom(6);
            
            // Passamos a SUGESTÃO e o RESULTADO para a nossa nova função
            const nomeFormatado = formatarNomeDestino(suggestion, results[0]);
            
            setSelectedPlace({ nome: nomeFormatado, lat, lng });
        } catch (error) { console.error("Erro ao obter coordenadas: ", error); }
    };

    const handleAddClick = () => {
        if (!selectedPlace) return;
        adicionarDestino(selectedPlace.nome, selectedPlace.lat, selectedPlace.lng);
        // Centraliza o mapa no local que acabou de ser adicionado
        setMapZoom(4);
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

    function SortableListItem({ destino, onDelete }: { destino: Destino, onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: destino._id! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <li ref={setNodeRef} style={style}>
            <div className="flex items-center gap-2 p-2 rounded bg-gray-700 w-full">
                {/* A "alça" de arrastar. SOMENTE ela tem os listeners. */}
                <div className="cursor-grab" {...attributes} {...listeners}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
                <span className="flex-1 text-lg min-w-0 truncate" title={destino.nome}>
                    {destino.ordem}. {destino.nome}
                </span>
                <button onClick={() => onDelete(destino._id!)} className="flex-shrink-0 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                    Excluir
                </button>
            </div>
        </li>
    );
}

    return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col h-screen max-h-screen">

        {/* --- CABEÇALHO E FORMULÁRIO --- */}
        <div className="flex-shrink-0">
            <h1 className="text-4xl font-bold mb-6 text-center md:text-left">Planejador de Viagem</h1>
            <div className="p-4 border rounded-lg mb-4">
                <h3 className="text-xl font-semibold mb-4">Adicionar Novo Destino</h3>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input type="text" placeholder="Digite o nome de uma cidade, local ou endereço..." value={value} onChange={(e) => { setValue(e.target.value); setSelectedPlace(null); }} disabled={!ready} className="p-2 border rounded w-full" />
                        {status === "OK" && (
                            <ul className="absolute z-10 w-full bg-black border rounded mt-1 max-h-60 overflow-y-auto">
                                {data.map((suggestion) => (
                                    <li key={suggestion.place_id} onClick={() => handleSelect(suggestion)} className="p-2 hover:bg-gray-600 cursor-pointer">{suggestion.description}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={handleAddClick} disabled={!selectedPlace} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">Adicionar</button>
                </div>
            </div>
        </div>

        {/* --- SEÇÃO DE TOTAIS --- */}
        {rota && rota.distanciaTotal > 0 && (
            <div className="flex-shrink-0 mt-2 mb-8 p-4 bg-gray-700 rounded-lg max-w-xl mx-auto">
                <h3 className="text-xl font-bold mb-2 text-center">Resumo da Viagem (Trechos Terrestres)</h3>
                <div className="flex justify-center items-center gap-8">
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Distância Calculada</p>
                        <p className="text-2xl font-semibold">{formatarDistancia(rota.distanciaTotal)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Duração Estimada</p>
                        <p className="text-2xl font-semibold">{formatarDuracao(rota.duracaoTotal)}</p>
                    </div>
                </div>
            </div>
        )}

        {/* --- ÁREA PRINCIPAL COM 3 COLUNAS --- */}
        <div className="flex-grow flex flex-col md:flex-row gap-8 min-h-0">

            {/* Coluna 1: Seu Roteiro */}
            <div className="md:w-1/3 flex flex-col">
                <h2 className="text-2xl font-semibold mb-4 flex-shrink-0">Seu Roteiro:</h2>
                <div className="overflow-y-auto pr-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={destinos.map(d => d._id!)} strategy={verticalListSortingStrategy}>
                            <ul className="space-y-2">
                                {destinos.map((destino) => (
                                     <SortableListItem key={destino._id} destino={destino} onDelete={handleDelete} />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Coluna 2: Detalhes da Rota */}
            <div className="md:w-1/3 flex flex-col">
                <h2 className="text-2xl font-semibold mb-4 flex-shrink-0">Detalhes da Rota:</h2>
                <div className="overflow-y-auto pr-2">
                    {isLoadingRota && <p>Calculando rota...</p>}
                    {!isLoadingRota && destinos.length < 2 && (<p className="text-gray-500">Adicione mais um destino para calcular a rota.</p>)}
                    {rota && rota.trechos.length > 0 && !isLoadingRota && (
                        <div className="space-y-4">
                            {rota.trechos.map((trecho, index) => (
                                <div key={index} className="p-2 border-b border-gray-700">
                                    <p><strong>De:</strong> {trecho.origem}</p>
                                    <p><strong>Para:</strong> {trecho.destino}</p>
                                    {trecho.tipo === 'CARRO' ? (
                                        <p>Distância: {trecho.distancia} | Duração: {trecho.duracao}</p>
                                    ) : (
                                        <p className="text-blue-400 font-semibold">✈️ Rota intercontinental ou muito longa.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Coluna 3: Mapa */}
            <div className="md:w-1/3 rounded-lg overflow-hidden min-h-[400px] md:min-h-full">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={mapZoom}
                    options={{ styles: [/* Seus estilos de mapa escuro */], disableDefaultUI: true, zoomControl: true }}
                >
                    {destinos.map((destino) => (
                        <MarkerF
                            key={destino._id}
                            position={{ lat: destino.latitude, lng: destino.longitude }}
                            label={{ text: destino.ordem.toString(), color: "white" }}
                            title={destino.nome}
                        />
                    ))}
                </GoogleMap>
            </div>
        </div>
    </main>
);
}