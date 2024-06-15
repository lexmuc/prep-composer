// noinspection SqlNoDataSourceInspection,SqlDialectInspection

import initSqlJs, {Database} from 'sql.js';
import SqlString from 'sqlstring';
import {$, sql, SqlSegment} from './index';

const escapeFn = (value: any) => {
    if (typeof value === 'string') {
        return "'" + value.replace(/'/g, "''") + "'";
    } else return SqlString.escape(value);
};

const $table = $['employees'];
const $idField = $['employee_id'];
const $nameField = $['name'];
const $hireDateField = $['hire_date'];

const fieldDefinitions = [
    sql($idField, 'INT', 'PRIMARY KEY'),
    sql($nameField, 'VARCHAR(50)'),
    sql($hireDateField, 'DATE'),
];

const $create = sql('CREATE TABLE', $table, '(', fieldDefinitions, ')');

const name1 = "O'Brien";
const name2 = 'Doe "John"';
const $insert = sql(
    'INSERT INTO employees (', [$idField, $nameField, $hireDateField], ') VALUES (',
    [$(1), $(name1), $('2020-01-01')],
    '), (',
    [$(2), $(name2), $('2020-01-02')],
    ')'
);

const $select = sql('SELECT * FROM', $table, 'ORDER BY', $idField);

const runWithEscaping = (db: Database, seg: SqlSegment) => db.exec(seg.toString(escapeFn));

const queryWithEscaping = (db: Database, seg: SqlSegment) => db.exec(seg.toString(escapeFn))[0].values;

const runPrepared = (db: Database, seg: SqlSegment) => {
    const stmt = db.prepare(seg.toString());
    // @ts-ignore
    stmt.run(seg.parameters);
    stmt.free();
}

const queryPrepared = (db: Database, seg: SqlSegment) => {
    const stmt = db.prepare(seg.toString());
    // @ts-ignore
    stmt.bind(seg.parameters);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.get());
    }
    stmt.free();
    return rows;
}

test('it can be used with an escape function to create a table, add rows and read from it', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    runWithEscaping(db, $create);
    runWithEscaping(db, $insert);

    expect(queryWithEscaping(db, $select)).toEqual([
        [1, name1, '2020-01-01'],
        [2, name2, '2020-01-02'],
    ]);
});

test('it can be used with prepared statements to create a table, add rows and read from it', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    runPrepared(db, $create);
    runPrepared(db, $insert);

    expect(queryPrepared(db, $select)).toEqual([
        [1, name1, '2020-01-01'],
        [2, name2, '2020-01-02'],
    ]);
});
