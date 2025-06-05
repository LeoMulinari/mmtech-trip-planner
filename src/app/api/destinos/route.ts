// src/app/api/destinos/route.ts
import DataStore from 'nedb';
import { NextResponse } from 'next/server';
import path from 'path';

// Caminho para o arquivo do banco de dados
// Usamos path.join para garantir que funcione em diferentes sistemas operacionais
// process.cwd() é o diretório raiz do seu projeto Next.js
const dbFilePath = path.join(process.cwd(), 'database', 'destinos.db');

// Inicializa o NeDB
// Se o arquivo não existir, ele será criado
const db = new DataStore({ filename: dbFilePath, autoload: true });

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
        // 1. Recebe os dados do frontend.
        // Esperamos que o frontend envie nome, lat, lon e opcionalmente descricao/imageUrl
        const body = await request.json() as {
            nome: string;
            latitude: number;
            longitude: number;
            descricao?: string;
            imageUrl?: string;
        };

        // 2. Validação básica
        if (!body.nome || body.latitude === undefined || body.longitude === undefined) {
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
            descricao: body.descricao, // Será undefined se não for enviado
            imageUrl: body.imageUrl,   // Será undefined se não for enviado
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