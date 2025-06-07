// src/app/api/destinos/route.ts
import { NextResponse } from 'next/server';
// IMPORTAMOS NOSSA INSTÂNCIA ÚNICA DO DB
import db from '@/lib/database';

interface Destino {
    _id?: string;         // Gerado pelo NeDB, opcional no nosso código
    nome: string; // Ex: "Parque Vila Velha, Ponta Grossa - PR, Brasil"
    latitude: number;
    longitude: number;
    ordem: number;
    descricao?: string;   // Campo opcional
    imageUrl?: string;    // Campo opcional
    createdAt: Date;
}

// Função para lidar com requisições GET (Listar destinos)
export async function GET() {
    try {
        const destinos = await new Promise<Destino[]>((resolve, reject) => {
            // Usamos .sort({ ordem: 1 }) para garantir que os destinos venham na ordem correta.
            // O '1' significa ordem ascendente (1, 2, 3, ...).
            db.find({}).sort({ ordem: 1 }).exec((err, docs) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(docs as Destino[]);
            });
        });
        return NextResponse.json(destinos);
    } catch (error) {
        console.error("Erro ao buscar destinos:", error);
        return NextResponse.json({ message: 'Erro ao buscar destinos' }, { status: 500 });
    }
}

// Função para lidar com requisições POST (Adicionar novo destino)
export async function POST(request: Request) {
    try {
        // 1. Recebe os dados do frontend.
        // Esperamos que o frontend envie nome, lat, lon e opcionalmente descricao/imageUrl
        const body = await request.json() as {
            nome: string;
            latitude: number;
            longitude: number;
      
        };

        // 2. Validação básica
        if (!body.nome ||  body.latitude === undefined || body.longitude === undefined) {
            return NextResponse.json({ message: 'Campos nome, latitude e longitude são obrigatórios' }, { status: 400 });
        }

        // 3. Lógica para definir a ordem automaticamente
        // Contamos quantos destinos já existem para definir a ordem do novo.
        const totalDestinos = await new Promise<number>((resolve, reject) => {
            db.count({}, (err, count) => {
                if (err) { reject(err); }
                else { resolve(count); }
            });
        });

        // 4. Cria o objeto completo do novo destino
        const novoDestino: Destino = {
            nome: body.nome,
            latitude: body.latitude,
            longitude: body.longitude,
            ordem: totalDestinos + 1,  // O novo destino será o último da lista
            createdAt: new Date()      // Data e hora atuais
        };

        // 5. Insere o novo destino no banco de dados
        const destinoAdicionado = await new Promise<Destino>((resolve, reject) => {
            db.insert(novoDestino, (err, newDoc) => {
                if (err) { reject(err); }
                else { resolve(newDoc as Destino); }
            });
        });

        return NextResponse.json(destinoAdicionado, { status: 201 });

    } catch (error) {
        console.error("Erro ao adicionar destino:", error);
        return NextResponse.json({ message: 'Erro interno ao adicionar destino', error }, { status: 500 });
    }
}

// Você precisará adicionar funções para PUT (atualizar) e DELETE para o CRUD completo.
// export async function PUT(request: Request) { /* ... lógica para atualizar ... */ }
// export async function DELETE(request: Request) { /* ... lógica para deletar ... */ }