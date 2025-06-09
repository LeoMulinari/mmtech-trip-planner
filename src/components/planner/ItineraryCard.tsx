'use client';
import { Destino } from '@/types';
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FaListUl } from 'react-icons/fa';
import { SortableListItem } from './SortableListItem';

type ItineraryCardProps = {
  destinos: Destino[];
  onEdit: (destino: Destino) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  isSubmitting: boolean;
};

export default function ItineraryCard({ destinos, onDelete, onDragEnd, isSubmitting, onEdit}: ItineraryCardProps) {
  // Configura os sensores para o Dnd-Kit, habilitando o arrastar com o mouse (PointerSensor)
  // e também com o teclado (KeyboardSensor) para uma melhor acessibilidade.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col h-full">
        <div className="flex justify-between items-baseline mb-4 flex-shrink-0">
            <h2 className="flex items-center gap-3 text-2xl font-semibold text-white">
                <FaListUl className="text-sky-400" />
                Seu Roteiro
            </h2>
            <p className="text-xs text-slate-400 italic">Arraste para reordenar</p>
        </div>
        <div className="overflow-y-auto pr-2 -mr-2 flex-grow">
            {/* O DndContext é o provedor principal que gerencia todo o estado do drag-and-drop */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                {/* O SortableContext informa ao DndContext qual é a lista de itens ordenáveis e qual estratégia usar */}
                <SortableContext items={destinos.map(d => d._id!)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-3">
                        {/* Mapeia a lista de destinos renderizando cada um como um item arrastável */}
                        {destinos.map((destino) => (
                            <SortableListItem 
                                key={destino._id} 
                                destino={destino}
                                onEdit={onEdit}
                                onDelete={onDelete} 
                                isSubmitting={isSubmitting}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        </div>
    </div>
  );
}