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
  MySQL and compatible databases using `backtick` escaping.

## Usage

```javascript
const {sql, $} = require('prep-composer');
const SqlString = require('sqlstring'); // optional

const name = "O'Brien";

const selectFromPart = sql('SELECT * FROM', $['users']); // identifier escaping is optional
const conditionPart = sql('name =', $(name), 'AND age >=', $(18));
const query = sql(selectFromPart, 'WHERE', conditionPart);

console.log(query.toString());
// SELECT * FROM `users` WHERE name = ? AND age >= ?

console.log(query.parameters);
// [ "O'Brien", 18]

console.log(query.toString(SqlString.escape));
// SELECT * FROM `users` WHERE name = 'O\'Brien' AND age >= 18
```

## Installation

You can install **prep-composer** using npm:

```bash
npm install prep-composer
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to contribute to this project by submitting issues or pull requests. Your feedback and contributions
are welcome!
