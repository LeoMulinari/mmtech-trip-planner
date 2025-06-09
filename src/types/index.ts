export interface Destino {
    _id?: string;
    nome: string;
    latitude: number;
    longitude: number;
    ordem: number;
    createdAt: Date;
}

export interface RotaData {
    trechos: {
        origem: string;
        destino: string;
        distancia: string;
        duracao: string;
        tipo: 'CARRO' | 'VOO_OU_LONGA_DISTANCIA';
    }[];
    distanciaTotal: number;
    duracaoTotal: number;
}

export interface SelectedPlace {
    nome: string;
    lat: number;
    lng: number;
}