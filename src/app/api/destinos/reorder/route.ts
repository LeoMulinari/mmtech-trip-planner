import db from '@/lib/database';
import { NextResponse } from 'next/server';

interface Destino {
  _id?: string;
  ordem: number;
}

export async function POST(request: Request) {
  try {
    const { destinos } = (await request.json()) as { destinos: Destino[] };

    if (!destinos || !Array.isArray(destinos)) {
      return NextResponse.json({ message: 'Lista de destinos inválida.' }, { status: 400 });
    }

    for (const destino of destinos) {
      await new Promise<void>((resolve, reject) => {
        db.update({ _id: destino._id }, { $set: { ordem: destino.ordem } }, {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return NextResponse.json({ message: 'Ordem salva com sucesso!' });
  } catch (error) {
    console.error('Erro ao reordenar destinos:', error);
    return NextResponse.json({ message: 'Erro interno ao salvar a ordem.' }, { status: 500 });
  }
}