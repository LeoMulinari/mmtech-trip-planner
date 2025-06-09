'use client';
import { Destino } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaPencilAlt } from 'react-icons/fa';

type SortableListItemProps = {
  destino: Destino;
  onDelete: (id: string) => void;
  onEdit: (destino: Destino) => void;
  isSubmitting: boolean;
};


export function SortableListItem({ destino, onDelete, onEdit, isSubmitting }: SortableListItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: destino._id! });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <li ref={setNodeRef} style={style} {...attributes}>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700 w-full group">
                <div className="cursor-grab touch-none text-slate-500 group-hover:text-white transition-colors" {...listeners}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </div>
                <span className="flex-1 text-lg min-w-0 truncate text-slate-300 group-hover:text-white transition-colors" title={destino.nome}>
                    <span className="font-bold text-white">{destino.ordem}.</span> {destino.nome}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* --- BOTÃO DE EDITAR NOVO --- */}
                    <button onClick={() => onEdit(destino)} disabled={isSubmitting} className="p-1 rounded-full text-slate-400 hover:bg-sky-500 hover:text-white transition-all">
                        <FaPencilAlt className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(destino._id!)} disabled={isSubmitting} className="flex-shrink-0 p-1 rounded-full bg-slate-600 text-slate-400 hover:bg-red-500 hover:text-white transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </li>
    );
}