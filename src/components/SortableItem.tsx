'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';


// Ícone para usar como alça de arrastar
const DragHandle = (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 cursor-grab active:cursor-grabbing" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
    </div>
);

export function SortableItem({ id, children }: { id: string, children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  
  // Estilos que aplicam a animação de arrastar
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    // O ref vai no container principal do item
    <div ref={setNodeRef} style={style}>
        <div className="flex items-center gap-3 bg-gray-700 p-2 rounded">
            {/* Apenas a "alça" recebe os eventos de arrastar */}
            <DragHandle {...attributes} {...listeners} />
            {/* O resto do conteúdo fica livre para receber cliques */}
            <div className="flex-grow">
                {children}
            </div>
        </div>
    </div>
  );
}