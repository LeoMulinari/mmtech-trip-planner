// Em: src/components/SortableItem.tsx
'use client';
import React from 'react';

// Este componente agora é apenas um li simples.
// Toda a lógica de "sortable" será movida para a página principal.
export function SortableItem({ children }: { children: React.ReactNode }) {
  return (
    <li>
      {children}
    </li>
  );
}