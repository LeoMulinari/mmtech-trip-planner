// Em: src/lib/database.ts

import DataStore from 'nedb';
import path from 'path';

// Tipagem para a nossa instância do banco de dados global
declare global {
  // Adicione esta linha para desabilitar a regra do linter apenas para a próxima linha
  // eslint-disable-next-line no-var
  var database: DataStore;
}

const dbFilePath = path.join(process.cwd(), 'database', 'destinos.db');
let db: DataStore;

// Esta mágica impede que o banco de dados seja reinicializado toda vez
// que o Next.js faz hot-reload no modo de desenvolvimento.
if (process.env.NODE_ENV === 'production') {
  db = new DataStore({ filename: dbFilePath, autoload: true });
} else {
  if (!global.database) {
    global.database = new DataStore({ filename: dbFilePath, autoload: true });
  }
  db = global.database;
}

export default db;