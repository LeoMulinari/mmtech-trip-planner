'use client';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { FaMap } from 'react-icons/fa';
import { Destino } from '@/types';

type MapCardProps = {
  destinos: Destino[];
  mapCenter: { lat: number; lng: number; };
  mapZoom: number;
};

export default function MapCard({ destinos, mapCenter, mapZoom }: MapCardProps) {
  return (
    <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col h-full">
      <h2 className="flex items-center gap-3 text-2xl font-semibold mb-4 text-white flex-shrink-0">
        <FaMap className="text-sky-400" />
        Mapa do Roteiro
      </h2>
      <div className="rounded-lg overflow-hidden flex-grow min-h-[500px]">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={mapZoom}
          options={{ 
            styles: [], 
            disableDefaultUI: true, 
            zoomControl: true 
          }}
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
  );
}