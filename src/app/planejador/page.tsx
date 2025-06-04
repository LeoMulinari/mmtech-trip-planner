// Em algum componente React, ex: src/app/planejador/page.tsx
'use client'; // Necessário para componentes que usam hooks como useState, useEffect

import { useState, useEffect } from 'react';

interface Destino {
    _id?: string;
    nome: string;
    createdAt?: Date;
}

export default function PlanejadorPage() {
    const [nomeDestino, setNomeDestino] = useState('');
    const [destinos, setDestinos] = useState<Destino[]>([]);

    const fetchDestinos = async () => {
        try {
            const response = await fetch('/api/destinos');
            if (!response.ok) throw new Error('Erro ao buscar destinos');
            const data = await response.json();
            setDestinos(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchDestinos();
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            const response = await fetch('/api/destinos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nomeDestino }),
            });
            if (!response.ok) throw new Error('Erro ao adicionar destino');
            // const novoDestino = await response.json(); // Você pode usar o novoDestino
            setNomeDestino(''); // Limpa o input
            fetchDestinos(); // Atualiza a lista
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <h1>Planejador de Viagem</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={nomeDestino}
                    onChange={(e) => setNomeDestino(e.target.value)}
                    placeholder="Nome do destino"
                />
                <button type="submit">Adicionar</button>
            </form>
            <h2>Destinos:</h2>
            <ul>
                {destinos.map((destino) => (
                    <li key={destino._id}>{destino.nome}</li>
                ))}
            </ul>
        </div>
    );
}