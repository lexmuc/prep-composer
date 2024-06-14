# prep-composer
**prep-composer** is a lightweight JavaScript utility that facilitates convenient and safe composition of SQL
statements by automatically managing and escaping parameters.

## Features

- Inline parameter values without worrying about their order and number.
- Integrates with established escaping utilities like **sqlstring**, or outputs `?` placeholders for prepared
  statements.
- Programmatically compose complex SQL statements by breaking them up into independent segments.
- Works with all SQL dialects.

## Usage

```javascript
const {sql, $} = require('prep-composer');
const SqlString = require('sqlstring'); // optional

const name = "O'Brien";
const query = sql('SELECT * FROM users WHERE name =', $(name), 'AND age >=', $(18));

console.log(query.toString());
// SELECT * FROM users WHERE name = ? AND age >= ?

console.log(query.parameters);
// [ "O'Brien", 18]

console.log(query.toString(SqlString.escape));
// SELECT * FROM users WHERE name = 'O\'Brien' AND age >= 18
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to contribute to this project by submitting issues or pull requests. Your feedback and contributions
are welcome!
