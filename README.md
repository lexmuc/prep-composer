# prep-composer

**prep-composer** is a lightweight JavaScript utility that facilitates convenient and safe composition of SQL
statements by automatically managing and escaping parameters.

## Features

- Inline parameter values without worrying about their order and number.
- Identifier escaping
- Integrates with established escaping utilities like **sqlstring**, or outputs `?` placeholders for prepared
  statements.
- Compose complex SQL statements by breaking them up into independent segments.
- Works with all SQL dialects but if identifier escaping is used it currently only works for MySQL and compatible
  DBs (\`backtick\` escaping).

## Usage

```javascript
const {sql, $} = require('prep-composer');
const SqlString = require('sqlstring'); // optional

const name = "O'Brien";
const $selectFromUsers = sql('SELECT * FROM', $['users']);
const $condition = sql(
    $['name'], '=', $(name), 'AND age >=', $(18) // identifier escaping is optional
);
const $query = sql($selectFromUsers, 'WHERE', $condition);

console.log($query.toString());
// SELECT * FROM `users` WHERE `name` = ? AND age >= ?

console.log($query.parameters);
// [ "O'Brien", 18]

console.log($query.toString(SqlString.escape));
// SELECT * FROM `users` WHERE `name` = 'O\'Brien' AND age >= 18
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to contribute to this project by submitting issues or pull requests. Your feedback and contributions
are welcome!
