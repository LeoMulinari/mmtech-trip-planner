import db from '@/lib/database';
import { Destino } from '@/types'; // Assumindo que você moveu para /types
import { NextResponse } from 'next/server';

// --- FUNÇÃO DELETE (Com assinatura 100% correta) ---
export async function DELETE(
    request: Request, 
    context: { params: { id: string } } // MUDANÇA 1: Recebemos o 'context'
) {
    try {
        const idParaDeletar = context.params.id; // MUDANÇA 2: Pegamos o id de context.params

        const destinoExiste: Destino | null = await new Promise((resolve, reject) => {
            db.findOne({ _id: idParaDeletar }, (err, doc) => {
                if (err) reject(err);
                else resolve(doc as Destino | null);
            });
        });

        if (!destinoExiste) {
            return NextResponse.json({ message: 'Destino não encontrado' }, { status: 404 });
        }

        await new Promise<void>((resolve, reject) => {
            db.remove({ _id: idParaDeletar }, {}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const destinosRestantes: Destino[] = await new Promise((resolve, reject) => {
            db.find({}).sort({ ordem: 1 }).exec((err, docs) => {
                if (err) reject(err);
                else resolve(docs as Destino[]);
            });
        });

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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao deletar destino ${context.params.id}:`, errorMessage); // MUDANÇA 3: Usando context.params.id
        return NextResponse.json({ message: 'Erro ao deletar destino' }, { status: 500 });
    }
}

// --- FUNÇÃO PUT (Com assinatura 100% correta) ---
export async function PUT(
    request: Request, 
    context: { params: { id: string } } // MUDANÇA 1: Recebemos o 'context'
) {
    try {
        const idParaAtualizar = context.params.id; // MUDANÇA 2: Pegamos o id de context.params
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao atualizar destino ${context.params.id}:`, errorMessage); // MUDANÇA 3: Usando context.params.id
        return NextResponse.json({ message: 'Erro ao atualizar destino' }, { status: 500 });
    }
}