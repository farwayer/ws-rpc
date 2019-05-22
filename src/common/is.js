module.exports = {
  string: isType('string'),
  number: isType('number'),
  function: isType('function'),
  object: isType('object'),
  array: val => Array.isArray(val),
  defined: val => val !== undefined,
  null: val => val === null,
  integer: val => Number.isInteger(val),
}

function isType(type) {
  return val => typeof val === type
}
