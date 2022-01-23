const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

/**
 * DB
 * Core functions for interactions with the database.
 * TODO: Export common things into their own module so they can be reused across JS projects.
 */

// Because we are using a basic sqlite instance for this implementation we need the path to the file.
const dbLocation = `${__dirname}/../../db/services.db`;

let dbInstance = null;

open({
  filename: dbLocation,
  driver: sqlite3.Database,
})
  .then((db) => {
    dbInstance = db;
  })
  .catch((e) => console.error(e));

const getDb = () => {
  if (!dbInstance) {
    console.error("Database not ready yet!");
  }
  return dbInstance;
};

module.exports = {
  getDb,
};
