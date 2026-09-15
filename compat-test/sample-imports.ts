/**
 * Minimal consumer app: typecheck only (no runtime / no ArangoDB).
 * Simulates a project that depends on the published arangojs package.
 */
import arangojs, { aql, Database } from "arangojs";
import type { DocumentCollection } from "arangojs/collections";
import type { Cursor } from "arangojs/cursors";
import type { Document } from "arangojs/documents";

type Person = { name: string };

const db: Database = arangojs({
  url: "http://127.0.0.1:8529",
  databaseName: "_system",
});

const people: DocumentCollection<Person> = db.collection<Person>("people");
const query = aql`FOR doc IN ${people} RETURN doc`;

function runQuery(): Promise<Cursor<Document<Person>>> {
  return db.query<Document<Person>>(query);
}

void db;
void query;
void people;
void runQuery;
