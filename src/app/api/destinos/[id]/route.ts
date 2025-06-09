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

//  FUNÇÃO DELETE 
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const idParaDeletar = params.id;

        // Garante que o destino existe antes de fazer qualquer coisa
        const destinoExiste = await new Promise((resolve, reject) => {
            db.findOne({ _id: idParaDeletar }, (err, doc) => {
                if (err) reject(err);
                else resolve(doc);
            });
        });

        if (!destinoExiste) {
            return NextResponse.json({ message: 'Destino não encontrado' }, { status: 404 });
        }

        // Remove o destino do banco de dados
        await new Promise<void>((resolve, reject) => {
            db.remove({ _id: idParaDeletar }, {}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Pega todos os destinos restantes, já ordenados
        const destinosRestantes: Destino[] = await new Promise((resolve, reject) => {
            db.find({}).sort({ ordem: 1 }).exec((err, docs) => {
                if (err) reject(err);
                else resolve(docs as Destino[]);
            });
        });

        // Reindexa a ordem de todos os itens restantes
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

// FUNÇÃO PUT 
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const idParaAtualizar = params.id;
        const body = await request.json();

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