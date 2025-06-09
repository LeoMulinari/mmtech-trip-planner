// Em: src/components/planner/ItineraryCard.tsx
'use client';

import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableListItem } from './SortableListItem';
import { FaListUl } from 'react-icons/fa';
import { Destino } from '@/types';

// Props que o componente recebe da página principal
type ItineraryCardProps = {
  destinos: Destino[];
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  isSubmitting: boolean;
};

export default function ItineraryCard({ destinos, onDelete, onDragEnd, isSubmitting }: ItineraryCardProps) {
  // Sensores para o DND-Kit, permitindo arrastar com mouse e teclado
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={destinos.map(d => d._id!)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {destinos.map((destino) => (
                <SortableListItem 
                  key={destino._id} 
                  destino={destino} 
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