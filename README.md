# API

## Database

### new Database(config)

### database.query(query, [bindVars,] callback)

#### cursor.all(callback)

#### cursor.next(callback)

#### cursor.hasNext():Boolean

#### cursor.each(fn, callback)

#### cursor.every(fn, callback)

#### cursor.some(fn, callback)

#### cursor.map(fn, callback)

#### cursor.reduce(fn, [accu,] callback)

### Manipulating Collections

#### database.createCollection(properties, callback)

#### database.collection(collectionName, [autoCreate,] callback)

#### database.collections(excludeSystem, callback)

#### database.dropCollection(collectionName, callback)

#### database.truncate(callback)

### Manipulating Graphs

#### database.createGraph(properties, callback)

#### database.graph(graphName, [autoCreate,], callback)

#### database.graphs(callback)

#### database.dropGraph(graphName, [dropCollections,] callback)

### Manipulating Databases

#### database.createDatabase(databaseName, callback)

#### database.database(databaseName, [autoCreate,] callback)

#### database.databases(callback)

#### database.dropDatabase(databaseName, callback)

## Collections

### Manipulating the collection

#### collection.properties(callback)

#### collection.count(callback)

#### collection.revision(callback)

#### collection.checksum(callback)

#### collection.load(callback)

#### collection.unload(callback)

#### collection.setProperties(properties, callback)

#### collection.rename(name, callback)

#### collection.rotate(callback)

#### collection.truncate(callback)

#### collection.drop(callback)

### Manipulating documents

#### collection.replace(documentHandle, data, [opts,] callback)

#### collection.update(documentHandle, data, [opts,] callback)

#### collection.remove(documentHandle, [opts,] callback)

#### collection.all([opts,] callback)

### Manipulating regular documents

#### documentCollection.document(documentHandle, callback)

#### documentCollection.save(data, [opts,] callback)

### Manipulating edge documents

#### edgeCollection.edge(documentHandle, callback)

#### edgeCollection.save(data, fromId, toId, [opts,] callback)

#### edgeCollection.edges(vertex, [opts,] callback)

#### edgeCollection.inEdges(vertex, [opts,] callback)

#### edgeCollection.outEdges(vertex, [opts,] callback)

## Graphs

### graph.drop([dropCollections,] callback)

### Manipulating vertices

#### graph.vertexCollection(collectionName, callback)

#### graph.addVertexCollection(collectionName, callback)

#### graph.removeVertexCollection(collectionName, [dropCollection,] callback)

### Manipulating edges

#### graph.edgeCollection(collectionName, callback)

#### graph.addEdgeDefinition(definition, callback)

#### graph.replaceEdgeDefinition(definitionName, definition, callback)

#### graph.removeEdgeDefinition(definitionName, [dropCollection,] callback)

### Vertex Collections

#### vertexCollection.vertex(documentHandle, callback)

#### vertexCollection.save(data, [opts,] callback)

### Edge Collections

#### edgeCollection.edge(documentHandle, callback)

#### edgeCollection.save(data, fromId, toId, [opts,] callback)