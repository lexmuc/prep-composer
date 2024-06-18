# prep-composer

**prep-composer** is a lightweight JavaScript utility that facilitates convenient and safe composition of SQL
statements by automatically managing and escaping parameters.

### Features

- **Inline Parameter Values**: Simplifies SQL writing by automatically managing the order and number of parameter
  values. No placeholders and separate parameter list.
- **Modular SQL Composition**: Allows the creation of complex SQL statements through independent, reusable segments.
- **Identifier Escaping**: Supports escaping of identifiers for enhanced security.
- **Flexible Integration**: Compatible with established escaping utilities like **sqlstring**, and supports `?`
  placeholders for prepared statements.
- **Dialect Compatibility**: Designed to work with all SQL dialects; identifier escaping is currently optimized for
  MySQL and compatible databases using \`backtick\` escaping.

## Usage

```javascript
const {sql, $} = require('prep-composer');
const SqlString = require('sqlstring'); // optional

const name = "O'Brien";
const newJobTitle = 'Senior Developer';

const updateTable = sql('UPDATE', $['my_db']['employees']); // identifier escaping is optional
const fieldsToUpdate = {
    job_title: 'Designer',
    salary: 200000,
};
const condition = sql('name =', $(name));

const query = sql(updateTable, 'SET', $(fieldsToUpdate), 'WHERE', condition);

console.log(query.toString());
// UPDATE `my_db`.`employees` SET `job_title` = ?, `salary` = ? WHERE name = ?

console.log(query.parameters);
// [ "Designer", 200000, "O'Brien" ]

console.log(query.toString(SqlString.escape));
// UPDATE `my_db`.`employees` SET `job_title` = 'Designer', `salary` = 200000 WHERE name = 'O\'Brien'
```

## Installation

You can install **prep-composer** using npm:

```bash
npm install prep-composer
```

## API documentation

### `sql(...args: (Fragment | Fragment[])[]): SqlSegment`

Creates a new `SqlSegment` composed of the provided fragments. Fragments can be strings, literals,
identifiers, or values. Raw SQL is typically represented by a `string` fragment. It will be turned into a `Literal`
internally. An array of fragments is flattened into the SQL segment, separated by commas. 

### `Fragment`

Type definition for an SQL fragment. A fragment can be a `Literal`, a `string` (will be turned into a `Literal`),
a `Value`, an `Identifier` or an `SqlSegment`.

### `$(value: any): Value|SqlSegment[]`

Helper function to create a new `Value` fragment for the given value. Values represent the variable fragments of 
a statement that are later escaped or replaced with placeholders.

If the passed value is an array, it is turned into 
an array of `SqlSegment`s by converting all the elements to values if they are not of type `Literal` or `SqlSegment`.
This is practical for creating `IN` conditions.

If an object is passed it will be turned into a series of escaped-key=escaped-value assignments. If values are already
literals, values or identifiers, they are used as is. So to set a field to a static raw SQL value, you have to wrap
the value in an `sql` function call (e.g. `{ hire_date: sql('NOW()') }`) otherwise it is interpreted as a parameter
that has to be escaped.

### `$.<identifier>` or `$[<identifier>]`

Helper to create a new `Identifier` fragment for the given identifier. The identifier is immediately escaped
with backticks when passed to the `sql` function. Identifiers can be chained: `$['db']['field']` 
(yields `` `db`.`field` ``). It is recommended to use the square
brackets syntax `$[<identifier>]` for consistency. Dots within identifiers are preserved (`$['db.field']` 
yields `` `db.field` ``).

### `SqlSegment`

Represents a composite SQL segment composed of multiple fragments. A segment can be used as a part of another
segment, allowing the creation of complex SQL statements.

**Members**:
  - `toString(escapeFn?: (value: any) => string): string`: Returns the SQL statement as a string. 
    If `escapeFn` is provided, it will be used to escape values. Otherwise `?` placeholders are output.
  - `parameters: any[]`: An array of parameter values extracted from the SQL segment.
  - `append(fragment: Fragment | Fragment[]): SqlSegment`: Returns a new `SqlSegment` by appending the provided
    fragment(s) to the current segment. As in the `sql` function, an array of fragments is flattened into the SQL and
    separated by commas. Spaces are automatically added between fragments if required.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to contribute to this project by submitting issues or pull requests. Your feedback and contributions
are welcome!
