/**
 * Frozen compatibility sample for arangojs 10.5.0, the last release built
 * before this repository moved to TypeScript 7. Typecheck only; no server.
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
