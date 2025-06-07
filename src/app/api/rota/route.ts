import { NextResponse } from 'next/server';

interface Destino {
    _id?: string;         // Gerado pelo NeDB, opcional no nosso código
    nome: string;
    latitude: number;
    longitude: number;
    ordem: number;
    descricao?: string;   // Campo opcional
    imageUrl?: string;    // Campo opcional
    createdAt: Date;
}

interface RotaResponse {
    trechos: {
        origem: string;
        destino: string;
        distancia: string;
        duracao: string;
    }[];
    distanciaTotal: number; // em metros
    duracaoTotal: number; // em segundos
}

export async function POST(request: Request) {
    try {
        const { destinos } = await request.json() as { destinos: Destino[] };

        if (!destinos || destinos.length < 2) {
            return NextResponse.json({ message: 'São necessários pelo menos dois destinos para calcular uma rota.' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_Maps_API_KEY; 
        if (!apiKey) {
            throw new Error('A chave de API do Google Maps não foi configurada.');
        }

        const response: RotaResponse = {
            trechos: [],
            distanciaTotal: 0,
            duracaoTotal: 0,
        };

        // Itera sobre os pares de destinos para calcular cada trecho
        for (let i = 0; i < destinos.length - 1; i++) {
            const origem = destinos[i];
            const destino = destinos[i + 1];

            // Trocamos os nomes pelas coordenadas no formato "latitude,longitude"
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origem.latitude},${origem.longitude}&destination=${destino.latitude},${destino.longitude}&key=${apiKey}&language=pt-BR`;
            const googleResponse = await fetch(url);
            const data = await googleResponse.json();

           // A verificação de status continua, mas sem os logs
            if (data.status !== 'OK' || !data.routes[0]?.legs[0]) {
                console.warn(`Não foi possível encontrar rota entre ${origem.nome} e ${destino.nome}. Verifique as coordenadas.`);
                continue; 
            }

            const leg = data.routes[0].legs[0];
            
            response.trechos.push({
                origem: origem.nome,
                destino: destino.nome,
                distancia: leg.distance.text, // "115 km"
                duracao: leg.duration.text,   // "1 hora 45 minutos"
            });
            
            response.distanciaTotal += leg.distance.value; // valor em metros
            response.duracaoTotal += leg.duration.value;   // valor em segundos
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error("Erro ao calcular rota:", error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
        return NextResponse.json({ message: 'Erro ao calcular rota', error: errorMessage }, { status: 500 });
    }
}