import { NextResponse } from 'next/server';
import db from '@/lib/database';
interface Destino {
    _id?: string;       
    nome: string; 
    latitude: number;
    longitude: number;
    ordem: number;
    createdAt: Date;
}

// Função para lidar com requisições GET (Listar destinos)
export async function GET() {
    try {
        const destinos = await new Promise<Destino[]>((resolve, reject) => {
            // sort({ ordem: 1 }) para garantir que os destinos venham na ordem correta
            // O '1' significa ordem ascendente
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
        const body = await request.json() as {
            nome: string;
            latitude: number;
            longitude: number;
        };

        if (!body.nome ||  body.latitude === undefined || body.longitude === undefined) {
            return NextResponse.json({ message: 'Campos nome, latitude e longitude são obrigatórios' }, { status: 400 });
        }

        // Lógica para definir a ordem automaticamente
        const totalDestinos = await new Promise<number>((resolve, reject) => {
            db.count({}, (err, count) => {
                if (err) { reject(err); }
                else { resolve(count); }
            });
        });

        const novoDestino: Destino = {
            nome: body.nome,
            latitude: body.latitude,
            longitude: body.longitude,
            ordem: totalDestinos + 1,  
            createdAt: new Date()      
        };

        // Insere o novo destino no banco de dados
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