// Em: src/app/api/destinos/[id]/route.ts

import { NextResponse } from 'next/server';
// IMPORTAMOS NOSSA INSTÂNCIA ÚNICA DO DB
import db from '@/lib/database';

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

// --- FUNÇÃO DELETE (MAIS ROBUSTA) ---
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const idParaDeletar = params.id;

        // 1. Garante que o destino existe antes de fazer qualquer coisa
        const destinoExiste = await new Promise((resolve, reject) => {
            db.findOne({ _id: idParaDeletar }, (err, doc) => {
                if (err) reject(err);
                else resolve(doc);
            });
        });

        if (!destinoExiste) {
            return NextResponse.json({ message: 'Destino não encontrado' }, { status: 404 });
        }

        // 2. Remove o destino do banco de dados
        await new Promise<void>((resolve, reject) => {
            db.remove({ _id: idParaDeletar }, {}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // 3. Pega TODOS os destinos restantes, já ordenados
        const destinosRestantes: Destino[] = await new Promise((resolve, reject) => {
            db.find({}).sort({ ordem: 1 }).exec((err, docs) => {
                if (err) reject(err);
                else resolve(docs as Destino[]);
            });
        });

        // 4. Re-indexa a ordem de todos os itens restantes
        // Isso garante uma sequência contínua (1, 2, 3...)
        let novaOrdem = 1;
        for (const destino of destinosRestantes) {
            await new Promise<void>((resolve, reject) => {
                db.update({ _id: destino._id }, { $set: { ordem: novaOrdem } }, {}, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            novaOrdem++;
        }

        return NextResponse.json({ message: `Destino ${idParaDeletar} deletado com sucesso e a rota foi reordenada.` });

    } catch (error) {
        console.error(`Erro ao deletar destino ${params.id}:`, error);
        return NextResponse.json({ message: 'Erro ao deletar destino' }, { status: 500 });
    }
}

// --- FUNÇÃO PUT ---
// Atualiza um destino específico
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const idParaAtualizar = params.id;
        const body = await request.json();

        // Remove campos que não devem ser atualizados diretamente
        delete body._id;
        delete body.createdAt;

        const numReplaced = await new Promise<number>((resolve, reject) => {
            db.update({ _id: idParaAtualizar }, { $set: body }, {}, (err, num) => {
                if (err) { reject(err); }
                else { resolve(num); }
            });
        });

        if (numReplaced === 0) {
            return NextResponse.json({ message: 'Destino não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ message: `Destino ${idParaAtualizar} atualizado com sucesso.` });

    } catch (error) {
        console.error(`Erro ao atualizar destino ${params.id}:`, error);
        return NextResponse.json({ message: 'Erro ao atualizar destino' }, { status: 500 });
    }
}