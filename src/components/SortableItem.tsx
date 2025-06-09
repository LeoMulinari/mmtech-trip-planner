'use client';
import React from 'react';

export function SortableItem({ children }: { children: React.ReactNode }) {
  return (
    <li>
      {children}
    </li>
  );
}