'use client';
import { Destino, RotaData, SelectedPlace } from '@/types';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Componentes de UI
import ConfirmationModal from '@/components/ConfirmationModal';
import AddDestinationCard from '@/components/planner/AddDestinationCard';
import EditDestinationModal from '@/components/planner/EditDestinationModal';
import ItineraryCard from '@/components/planner/ItineraryCard';
import MapCard from '@/components/planner/MapCard';
import RouteDetailsCard from '@/components/planner/RouteDetailsCard';

/**
 * Componente principal da página do planejador de viagem.
 * Atua como um "container" que gerencia todo o estado da aplicação (destinos, rota, etc.)
 * e a lógica de manipulação de dados. Ele passa os dados e as funções para
 * componentes filhos, que são responsáveis apenas pela exibição (padrão Container/Presentational).
 */
export default function PlanejadorPage() {
    const [destinos, setDestinos] = useState<Destino[]>([]);
    const [rota, setRota] = useState<RotaData | null>(null);
    const [isLoadingRota, setIsLoadingRota] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; destinoId: string | null }>({ isOpen: false, destinoId: null });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; destino: Destino | null }>({ isOpen: false, destino: null});
    const [mapCenter, setMapCenter] = useState({ lat: -14.235, lng: -51.925 });
    const [mapZoom, setMapZoom] = useState(4);
 
    // Busca os destinos iniciais da API quando o componente é montado.
    const fetchDestinos = async () => {
        try {
            const response = await fetch('/api/destinos');
            if (!response.ok) throw new Error('Erro ao buscar destinos');
            const data: Destino[] = await response.json();
            setDestinos(data);
        } catch (error) {
            console.error(error);
            toast.error("Não foi possível carregar seus destinos.");
        }
    };
    useEffect(() => { fetchDestinos(); }, []);

    // Adiciona um novo destino, chamado pelo AddDestinationCard.
    const adicionarDestino = async (nome: string, latitude: number, longitude: number) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/destinos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, latitude, longitude }),
            });
            if (!response.ok) throw new Error('Falha ao adicionar destino');
            await fetchDestinos();
            toast.success("Destino adicionado com sucesso!");
        } catch (error) {
            toast.error("Não foi possível adicionar o destino.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Abre o modal de edição, passando os dados do destino a ser editado.
    const handleOpenEditModal = (destino: Destino) => {
        setEditModal({ isOpen: true, destino: destino });
    };

    // Salva as alterações do destino, chamado pelo EditDestinationModal.
    const handleUpdateDestination = async (id: string, novosDados: SelectedPlace) => {
        setIsSubmitting(true);
        const promise = fetch(`/api/destinos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome: novosDados.nome,
                latitude: novosDados.lat,
                longitude: novosDados.lng 
            }),
        }).then(res => {
            if (!res.ok) throw new Error('Falha ao atualizar');
            return fetchDestinos();
        });

        toast.promise(promise, {
            loading: 'Salvando alterações...',
            success: 'Destino atualizado!',
            error: 'Não foi possível salvar as alterações.',
        }).finally(() => setIsSubmitting(false));
    };

    // Abre o modal de confirmação de exclusão.
    const handleDelete = (id: string) => {
        setDeleteModal({ isOpen: true, destinoId: id });
    };
    // Efetivamente executa a exclusão após a confirmação no modal.
    const executarDelete = async () => {
        if (!deleteModal.destinoId) return;
        setIsSubmitting(true);
        const promise = fetch(`/api/destinos/${deleteModal.destinoId}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Falha ao deletar');
                return fetchDestinos();
            });

        toast.promise(promise, {
            loading: 'Excluindo...',
            success: 'Destino excluído com sucesso!',
            error: 'Não foi possível excluir o destino.',
        }).finally(() => setIsSubmitting(false));
    };

    // Manipula o fim de uma operação de arrastar, atualizando a ordem no estado e no backend.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = destinos.findIndex((item) => item._id === active.id);
            const newIndex = destinos.findIndex((item) => item._id === over.id);
            const reorderedItems = arrayMove(destinos, oldIndex, newIndex);
            const movedItem = reorderedItems[newIndex];
            const prevItem = reorderedItems[newIndex - 1];
            const nextItem = reorderedItems[newIndex + 1];

            // Regra de negócio para impedir destinos iguais em sequência.
            if ((prevItem && prevItem.nome === movedItem.nome) || (nextItem && nextItem.nome === movedItem.nome)) {
                toast.error("Não é permitido ter dois destinos iguais em sequência.");
                return;
            }

            const updatedDestinos = reorderedItems.map((item, index) => ({ ...item, ordem: index + 1 }));
            setDestinos(updatedDestinos);
            updateOrdemNoBackend(updatedDestinos);
        }
    };
    const updateOrdemNoBackend = async (novosDestinos: Destino[]) => {
        try {
            await fetch('/api/destinos/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destinos: novosDestinos }),
            });
        } catch (error) { console.error("Erro ao salvar a nova ordem:", error); }
    };
    
    // Efeito reativo: sempre que a lista de 'destinos' é alterada (adicionada, removida, reordenada),
    // esta função é acionada automaticamente para recalcular a rota completa.
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

    return (
        <>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="text-center mb-8">
                    <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                        Planejador de <span className="text-sky-400">Viagem</span>
                    </h1>
                </div>

                <AddDestinationCard
                    destinos={destinos}
                    onAddDestination={adicionarDestino}
                    isSubmitting={isSubmitting}
                    setMapCenter={setMapCenter}
                    setMapZoom={setMapZoom}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <ItineraryCard
                        destinos={destinos}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDelete}
                        onDragEnd={handleDragEnd}
                        isSubmitting={isSubmitting}
                    />
                    
                    <RouteDetailsCard
                        rota={rota}
                        isLoading={isLoadingRota}
                        destinosCount={destinos.length}
                    />

                    <MapCard
                        destinos={destinos}
                        mapCenter={mapCenter}
                        mapZoom={mapZoom}
                    />
                </div>
                 <footer className="text-center mt-12 py-4">
                    <p className="text-sm text-slate-500">
                        Projeto desenvolvido para o processo seletivo da MMtech.
                    </p>
                </footer>
            </main>

            <EditDestinationModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, destino: null })}
                onSave={handleUpdateDestination}
                destino={editModal.destino}
            />

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, destinoId: null })}
                onConfirm={executarDelete}
                title="Confirmar Exclusão"
                message="Você tem certeza que deseja remover este destino do seu roteiro?"
            />
        </>
    );
}