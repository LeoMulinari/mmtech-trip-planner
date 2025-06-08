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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700 w-full group">
            {/* Alça de arrastar com hover effect */}
            <div className="cursor-grab touch-none text-slate-500 group-hover:text-white transition-colors" {...attributes} {...listeners}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </div>

            <span className="flex-1 text-lg min-w-0 truncate text-slate-300 group-hover:text-white transition-colors" title={destino.nome}>
                <span className="font-bold text-white">{destino.ordem}.</span> {destino.nome}
            </span>

            {/* Botão de excluir com hover effect */}
            <button onClick={() => onDelete(destino._id!)} className="flex-shrink-0 p-1 rounded-full bg-slate-600 text-slate-400 hover:bg-red-500 hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    </li>
);
}

    return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* --- CABEÇALHO --- */}
        <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                Planejador de <span className="text-sky-400">Viagem</span>
            </h1>
        </div>

        {/* --- CARD DE ADIÇÃO DE DESTINO --- */}
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-lg mb-8">
            <h3 className="text-xl font-semibold mb-4 text-white">Adicionar Novo Destino</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-grow w-full">
                    <input
                        type="text"
                        placeholder="Digite um local, cidade ou endereço..."
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setSelectedPlace(null); }}
                        disabled={!ready}
                        className="p-3 w-full border-2 border-slate-600 bg-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    />
                    {status === "OK" && (
                        <ul className="absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                            {data.map((suggestion) => (
                                <li key={suggestion.place_id} onClick={() => handleSelect(suggestion)} className="p-3 hover:bg-sky-600 cursor-pointer transition-colors">{suggestion.description}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <button onClick={handleAddClick} disabled={!selectedPlace} className="w-full sm:w-auto px-6 py-3 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                    Adicionar
                </button>
            </div>
        </div>

        {/* --- CARD DE RESUMO DA VIAGEM --- */}
        {rota && rota.distanciaTotal > 0 && (
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-lg mb-8">
                <div className="flex flex-col sm:flex-row justify-around items-center text-center">
                    <div className="w-full sm:w-auto">
                        <p className="text-sm uppercase font-semibold text-slate-400 tracking-wider">Distância Terrestre</p>
                        <p className="text-3xl font-bold text-sky-400">{formatarDistancia(rota.distanciaTotal)}</p>
                    </div>
                    <div className="w-full sm:w-auto border-t border-slate-700 sm:border-t-0 sm:border-l sm:h-16 my-4 sm:my-0 mx-8"></div>
                    <div className="w-full sm:w-auto">
                        <p className="text-sm uppercase font-semibold text-slate-400 tracking-wider">Duração Estimada</p>
                        <p className="text-3xl font-bold text-sky-400">{formatarDuracao(rota.duracaoTotal)}</p>
                    </div>
                </div>
            </div>
        )}

        {/* --- ÁREA PRINCIPAL COM 3 COLUNAS DEFINITIVAS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Coluna 1: Seu Roteiro */}
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col">
                <h2 className="text-2xl font-semibold mb-4 text-white flex-shrink-0">Seu Roteiro</h2>
                <div className="overflow-y-auto pr-2 -mr-2 flex-grow">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={destinos.map(d => d._id!)} strategy={verticalListSortingStrategy}>
                            <ul className="space-y-3">
                                {destinos.map((destino) => (
                                    <SortableListItem key={destino._id} destino={destino} onDelete={handleDelete} />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Coluna 2: Detalhes da Rota */}
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col">
                <h2 className="text-2xl font-semibold mb-4 text-white flex-shrink-0">Detalhes da Rota</h2>
                <div className="overflow-y-auto pr-2 -mr-2 flex-grow">
                    {isLoadingRota && <p className="text-slate-400">Calculando rota...</p>}
                    {!isLoadingRota && destinos.length < 2 && (<p className="text-slate-500">Adicione mais um destino.</p>)}
                    {rota && rota.trechos.length > 0 && !isLoadingRota && (
                        <div className="space-y-4">
                            {rota.trechos.map((trecho, index) => (
                                <div key={index} className="p-3 border-b border-slate-700">
                                    <p className="font-semibold text-white">{trecho.origem}</p>
                                    <p className="pl-4 text-sm text-slate-400">↓</p>
                                    <p className="font-semibold text-white">{trecho.destino}</p>
                                    <div className="mt-2 text-sm">
                                    {trecho.tipo === 'CARRO' ? (
                                        <p>Distância: {trecho.distancia} <span className="text-slate-500">|</span> Duração: {trecho.duracao}</p>
                                    ) : (
                                        <p className="text-sky-400 font-semibold">✈️ Rota intercontinental ou muito longa.</p>
                                    )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Coluna 3: Mapa */}
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col">
                <h2 className="text-2xl font-semibold mb-4 text-white flex-shrink-0">Mapa do Roteiro</h2>
                <div className="rounded-lg overflow-hidden flex-grow min-h-[400px]">
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
                                label={{ text: destino.ordem.toString(), color: "white", fontWeight: "bold" }}
                                title={destino.nome}
                            />
                        ))}
                    </GoogleMap>
                </div>
            </div>
        </div>
    </main>

);
}