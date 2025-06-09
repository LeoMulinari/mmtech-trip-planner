'use client';
import { RotaData } from '@/types';
import { FaProjectDiagram, FaRegClock, FaRoute } from 'react-icons/fa';

type RouteDetailsCardProps = {
  rota: RotaData | null;
  isLoading: boolean;
  destinosCount: number;
};

// Funções auxiliares de formatação
const formatarDistancia = (metros: number) => `${(metros / 1000).toFixed(1)} km`;
const formatarDuracao = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas}h ${minutos}min`;
};

// Responsável por exibir o resumo da viagem e os detalhes de cada trecho da rota
export default function RouteDetailsCard({ rota, isLoading, destinosCount }: RouteDetailsCardProps) {
  return (
    <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col h-full">
        <h2 className="flex items-center gap-3 text-2xl font-semibold mb-4 text-white flex-shrink-0">
            <FaProjectDiagram className="text-sky-400" />
            Detalhes da Rota
        </h2>

        {/* O resumo só é exibido se houver uma rota calculada com trechos de carro */}
        {rota && rota.distanciaTotal > 0 && (
            <div className="p-4 mb-6 bg-slate-700/50 rounded-lg flex-shrink-0">
                <div className="flex justify-around items-center text-center">
                    <div>
                        <p className="flex items-center justify-center gap-2 text-xs uppercase font-semibold text-slate-400 whitespace-nowrap">
                            <FaRoute />
                            Distância Total
                        </p>
                        <p className="text-2xl font-bold text-sky-400">{formatarDistancia(rota.distanciaTotal)}</p>
                    </div>
                    <div>
                        <p className="flex items-center justify-center gap-2 text-xs uppercase font-semibold text-slate-400 whitespace-nowrap">
                            <FaRegClock />
                            Duração Total
                        </p>
                        <p className="text-2xl font-bold text-sky-400">{formatarDuracao(rota.duracaoTotal)}</p>
                    </div>
                </div>
            </div>
        )}
        
        <div className="overflow-y-auto pr-2 -mr-2 flex-grow">
            {/* Exibe mensagens de estado, como carregando ou precisando de mais destinos */}
            {isLoading && <p className="text-slate-400">Calculando rota...</p>}
            {!isLoading && destinosCount < 2 && (<p className="text-slate-500">Adicione pelo menos dois destinos para visualizar os detalhes da rota.</p>)}
            
            {/* Renderiza cada trecho da viagem, com uma aparência diferente para rotas de carro e aéreas/longas */}
            {rota && rota.trechos.length > 0 && !isLoading && (
                <div className="space-y-3">
                    {rota.trechos.map((trecho, index) => (
                        <div key={index} className="p-3 border-b border-slate-700 text-sm">
                            <div className="flex items-center gap-2 flex-wrap font-semibold text-white">
                                <span className="truncate" title={trecho.origem}>{trecho.origem.split(',')[0]}</span>
                                <span className="text-sky-400">→</span>
                                <span className="truncate" title={trecho.destino}>{trecho.destino.split(',')[0]}</span>
                            </div>
                            <div className="mt-2 text-slate-400">
                                {trecho.tipo === 'CARRO' ? (
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-2"><FaRoute /> {trecho.distancia}</span>
                                        <span className="flex items-center gap-2"><FaRegClock /> {trecho.duracao}</span>
                                    </div>
                                ) : (
                                    <span className="text-sky-400 font-semibold">✈️ Rota não calculável (viagem longa ou aérea)</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);
}