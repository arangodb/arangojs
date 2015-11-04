import {_BaseCollection as BaseCollection} from './collection';

export default function aqlQuery(strings, ...args) {
  const bindVars = {};
  let query = strings[0];
  for (let i = 0; i < args.length; i++) {
    let value = args[i];
    let name = `value${i}`;
    if (
      value instanceof BaseCollection
      || (value && value.constructor && value.constructor.name === 'ArangoCollection')
    ) {
      name = `@${name}`;
      value = typeof value.name === 'function' ? value.name() : value.name;
    }
    bindVars[name] = value;
    query += `@${name}${strings[i + 1]}`;
  }
  return {query, bindVars};
}
