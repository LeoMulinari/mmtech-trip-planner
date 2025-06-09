import DataStore from 'nedb';
import path from 'path';
declare global {
  // eslint-disable-next-line no-var
  var database: DataStore;
}

const dbFilePath = path.join(process.cwd(), 'database', 'destinos.db');
let db: DataStore;

if (process.env.NODE_ENV === 'production') {
  db = new DataStore({ filename: dbFilePath, autoload: true });
} else {
  if (!global.database) {
    global.database = new DataStore({ filename: dbFilePath, autoload: true });
  }
  db = global.database;
}

export default db;