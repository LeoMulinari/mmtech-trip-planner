// src/app/api/destinos/route.ts
import { NextResponse } from 'next/server';
import DataStore from 'nedb';
import path from 'path';

// Caminho para o arquivo do banco de dados
// Usamos path.join para garantir que funcione em diferentes sistemas operacionais
// process.cwd() é o diretório raiz do seu projeto Next.js
const dbFilePath = path.join(process.cwd(), 'database', 'destinos.db');

// Inicializa o NeDB
// Se o arquivo não existir, ele será criado
const db = new DataStore({ filename: dbFilePath, autoload: true });

// Tipagem para o nosso destino (opcional, mas bom para TypeScript)
interface Destino {
    _id?: string; // NeDB adiciona _id automaticamente
    nome: string;
    // Adicione outros campos conforme necessário: latitude, longitude, ordem, etc.
    createdAt?: Date;
}

// Função para lidar com requisições GET (Listar destinos)
export async function GET() {
    try {
        const destinos = await new Promise<Destino[]>((resolve, reject) => {
            db.find({}).sort({ createdAt: 1 }).exec((err, docs) => {
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
        return NextResponse.json({ message: 'Erro ao buscar destinos', error }, { status: 500 });
    }
}

// Função para lidar com requisições POST (Adicionar novo destino)
export async function POST(request: Request) {
    try {
        const body = await request.json() as Omit<Destino, '_id' | 'createdAt'>; // Omit para não esperar _id e createdAt no body

        if (!body.nome) {
            return NextResponse.json({ message: 'O nome do destino é obrigatório' }, { status: 400 });
        }

        const novoDestino: Destino = {
            ...body,
            createdAt: new Date()
        };

        const destinoAdicionado = await new Promise<Destino>((resolve, reject) => {
            db.insert(novoDestino, (err, newDoc) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(newDoc as Destino);
            });
        });

        return NextResponse.json(destinoAdicionado, { status: 201 });
    } catch (error) {
        console.error("Erro ao adicionar destino:", error);
        return NextResponse.json({ message: 'Erro ao adicionar destino', error }, { status: 500 });
    }
}

// Você precisará adicionar funções para PUT (atualizar) e DELETE para o CRUD completo.
// export async function PUT(request: Request) { /* ... lógica para atualizar ... */ }
// export async function DELETE(request: Request) { /* ... lógica para deletar ... */ }