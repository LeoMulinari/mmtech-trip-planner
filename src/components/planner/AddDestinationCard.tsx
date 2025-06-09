// Em: src/components/planner/AddDestinationCard.tsx
'use client';

import { formatarNomeDestino } from '@/lib/formatters';
import { Destino, SelectedPlace } from '@/types';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaCrosshairs, FaMapMarkedAlt } from 'react-icons/fa';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

// Props que o componente recebe da página principal
type AddDestinationCardProps = {
    destinos: Destino[];
    onAddDestination: (nome: string, latitude: number, longitude: number) => void;
    isSubmitting: boolean;
    setMapCenter: (position: { lat: number; lng: number; }) => void;
    setMapZoom: (zoom: number) => void;
};

export default function AddDestinationCard({
    destinos,
    onAddDestination,
    isSubmitting,
    setMapCenter,
    setMapZoom
}: AddDestinationCardProps) {
    // Estados relacionados à busca de local foram movidos para cá
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({ requestOptions: {}, debounce: 300 });

    const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
        const { place_id } = suggestion;
        setValue(suggestion.description, false);
        clearSuggestions();
        try {
            const results = await getGeocode({ placeId: place_id });
            const { lat, lng } = await getLatLng(results[0]);
            setMapCenter({ lat, lng });
            setMapZoom(12);
            const nomeFormatado = formatarNomeDestino(suggestion, results[0]);
            setSelectedPlace({ nome: nomeFormatado, lat, lng });
        } catch (error) {
            console.error("Erro ao obter coordenadas: ", error);
        }
    };

    const handleAddClick = () => {
        if (destinos.length >= 25) {
            toast.error("Você atingiu o limite de 25 destinos.");
            return;
        }
        if (!selectedPlace) return;
        if (destinos.length > 0 && destinos[destinos.length - 1].nome === selectedPlace.nome) {
            toast.error("Este destino já é o último do seu roteiro.");
            return;
        }
        onAddDestination(selectedPlace.nome, selectedPlace.lat, selectedPlace.lng);
        setValue("");
        setSelectedPlace(null);
        setMapZoom(4);
    };
    
    const handleGetCurrentLocation = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalização não é suportada pelo seu navegador.");
            return;
        }

        setIsFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const results = await getGeocode({ location: { lat: latitude, lng: longitude } });
                    const cidadeResult = results.find(r => r.types.includes("locality")) || results[0];

                    if (cidadeResult) {
                        const { lat, lng } = await getLatLng(cidadeResult);
                        const nomeFormatado = cidadeResult.formatted_address;
                        
                        if (destinos.length > 0 && destinos[destinos.length - 1].nome === nomeFormatado) {
                            toast.error("Sua localização atual já é o último destino da lista.");
                        } else {
                            // Chamando a função do pai através da prop
                            onAddDestination(nomeFormatado, lat, lng);
                        }
                    }
                } catch (error) {
                    console.error("Erro ao reverter geocode:", error);
                    toast.error("Não foi possível encontrar o endereço para sua localização.");
                } finally {
                    setIsFetchingLocation(false);
                }
            },
            (error) => {
                console.error("Erro de Geolocalização:", error);
                toast.error("Não foi possível obter sua localização. Verifique as permissões do navegador.");
                setIsFetchingLocation(false);
            }
        );
    };

    return (
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-lg mb-8">
            <h3 className="flex items-center gap-3 text-xl font-semibold mb-4 text-white">
                <FaMapMarkedAlt className="text-sky-400" />
                Adicionar Novo Destino
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-grow w-full">
                    <input
                        type="text"
                        placeholder={destinos.length === 0 ? "Adicione seu ponto de partida..." : "Adicione o próximo destino..."}
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setSelectedPlace(null); }}
                        disabled={!ready}
                        className="p-3 w-full border-2 border-slate-600 bg-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder:text-slate-400 text-slate-50"
                    />
                    {status === "OK" && (
                        <ul className="absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                            {data.map((suggestion) => (
                                <li key={suggestion.place_id} onClick={() => handleSelect(suggestion)} className="p-3 hover:bg-sky-600 cursor-pointer transition-colors text-slate-50">{suggestion.description}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <button onClick={handleAddClick} disabled={!selectedPlace || isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                    {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </button>
            </div>
            {/* --- NOVA DICA DE TEXTO PARA LOCALIZAÇÃO ATUAL --- */}
            <div className="flex justify-end mt-2">
                <button 
                    onClick={handleGetCurrentLocation} 
                    disabled={isFetchingLocation} 
                    className="flex items-center gap-2 text-xs text-slate-300 hover:text-sky-400 disabled:text-slate-600 transition-colors"
                >
                    {isFetchingLocation ? (
                        <>
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            Buscando...
                        </>
                    ) : (
                        <>
                            <FaCrosshairs />
                            Usar minha localização atual
                        </>
                    )}
                </button>
            </div>
            {/* --- DICA DE TEXTO CONDICIONAL ADICIONADA AQUI --- */}
            {destinos.length === 0 && (
                <p className="text-center text-xs text-slate-300 mt-4">
                    Dica: Para um melhor planejamento, comece adicionando seu ponto de partida.
                </p>
            )}
        </div>
    );
}