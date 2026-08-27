/**
 * Minimal consumer app: typecheck only (no runtime / no ArangoDB).
 * Simulates a project that depends on the published arangojs package.
 */
import arangojs, { aql, Database } from "arangojs";

const db: Database = arangojs({
  url: "http://127.0.0.1:8529",
  databaseName: "_system",
});

const query = aql`RETURN ${1}`;

void db;
void query;
