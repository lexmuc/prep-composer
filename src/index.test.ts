// noinspection SqlDialectInspection,SqlNoDataSourceInspection,JSJQueryEfficiency

import {$, Literal, sql, SqlSegment, Value} from "./index";

function expectFragments(cs: SqlSegment) {
    return function(...args: (Literal|Value)[]) {
        expect(cs.fragments).toEqual(args);
    }
}

function fakeEscape(s: any): string {
    return '<' + s.toString() + '>';
}

test('creating an SQL segment from a single string yields a segment with a single literal fragment', () => {
    expectFragments(
        sql('SELECT * FROM my_table')
    )(
        new Literal('SELECT * FROM my_table'),
    );
});

test('a Literal fragment can be passed to sql directly', () => {
    expectFragments(
        sql(new Literal('SELECT * FROM my_table'))
    )(
        new Literal('SELECT * FROM my_table'),
    );
});

test('values of different types can be interspersed with literal fragments', () => {
    expectFragments(
        sql('SELECT * FROM my_table WHERE field_a = ', new Value('x'), ' AND field_b = ', new Value(2))
    )(
        new Literal('SELECT * FROM my_table WHERE field_a = '),
        new Value('x'),
        new Literal(' AND field_b = '),
        new Value(2),
    );
});

test('$ can be used to conveniently create a single Value fragment', () => {
    expectFragments(
        sql('SELECT * FROM my_table WHERE field_a = ', $('x'), ' AND field_b = ', $(2))
    )(
        new Literal('SELECT * FROM my_table WHERE field_a = '),
        new Value('x'),
        new Literal(' AND field_b = '),
        new Value(2),
    );
});

test('$ can be used to create an identifier fragment that is turned into a literal with backticks', () => {
    expectFragments(
        sql('SELECT * FROM ', $['my_table'])
    )(
        new Literal('SELECT * FROM `my_table`'),
    );
});

test('a space is automatically added at the beginning of a literal after a value if required', () => {
    expectFragments(
        sql('SELECT * FROM my_table WHERE field_a =', $('x'), 'AND field_b = ', $(2), ' ORDER BY field_c')
    )(
        new Literal('SELECT * FROM my_table WHERE field_a = '),
        new Value('x'),
        new Literal(' AND field_b = '),
        new Value(2),
        new Literal(' ORDER BY field_c'),
    );
});

test('a space is automatically added before an escaped identifier if required', () => {
    expectFragments(
        sql('SELECT * FROM', $['my_table'], ' WHERE TRUE')
    )(
        new Literal('SELECT * FROM `my_table` WHERE TRUE'),
    );
});

test('a space is automatically added after an escaped identifier if required', () => {
    expectFragments(
        sql('SELECT * FROM ', $['my_table'], 'WHERE TRUE')
    )(
        new Literal('SELECT * FROM `my_table` WHERE TRUE'),
    );
});

test('identifiers can be chained and are separated by a dot', () => {
    expectFragments(
        sql('SELECT * FROM', $['my_db']['my_table'], 'WHERE TRUE')
    )(
        new Literal('SELECT * FROM `my_db`.`my_table` WHERE TRUE'),
    );
});

test('backticks in identifiers are escaped as double backticks', () => {
    expectFragments(
        sql('SELECT * FROM', $['my`table'], 'WHERE TRUE')
    )(
        new Literal('SELECT * FROM `my``table` WHERE TRUE'),
    );
});

test('literal fragments are merged and separated by a space if required', () => {
    expectFragments(
        sql('SELECT', '* ', 'FROM', ' my_table', 'WHERE TRUE')
    )(
        new Literal('SELECT * FROM my_table WHERE TRUE'),
    );
});

test('segments provided in arrays are concatenated with commas', () => {
    const fieldList = [
        sql('3 + 4 as', $['sum']),
        sql($('Miller'), 'as', $['name']),
        sql($['age'], 'as', $['number_of_years']),
    ];
    expectFragments(
        sql('SELECT', fieldList, 'FROM my_table')
    )(
        new Literal('SELECT 3 + 4 as `sum`, '),
        new Value('Miller'),
        new Literal(' as `name`, `age` as `number_of_years` FROM my_table'),
    );
});

test('arrays may contain literals, identifiers or values', () => {
    const options = [
        $['t']['some_field'],
        $('x'),
        'NOW()',
    ];
    expectFragments(
        sql('SELECT * from my_table WHERE field IN (', options, ')')
    )(
        new Literal('SELECT * from my_table WHERE field IN ( `t`.`some_field`, '),
        new Value('x'),
        new Literal(', NOW() )'),
    );
});

test('nested sql segments are flattened and spaces are interspersed if required', () => {
    const $selectSegment = sql('SELECT', '*', 'FROM', 'my_table');
    const $whereSegment = sql('WHERE field_a =', $(42));
    const $orderBySegment = sql(' ORDER BY', 'field_b');
    expectFragments(
        sql($selectSegment, $whereSegment, $orderBySegment)
    )(
        new Literal('SELECT * FROM my_table WHERE field_a = '),
        new Value(42),
        new Literal(' ORDER BY field_b'),
    );
});

test('nested segments may be empty', () => {
    const $selectSegment = sql('SELECT', '*', 'FROM', 'my_table');
    const $whereSegment = sql();
    const $orderBySegment = sql(' ORDER BY', 'field_b');
    expectFragments(
        sql($selectSegment, $whereSegment, $orderBySegment)
    )(
        new Literal('SELECT * FROM my_table ORDER BY field_b'),
    );
});

test('passing an array to $() yields an array of values', () => {
    expect(sql('WHERE field IN (', $(['1', 2, 'three']), ')'))
        .toEqual(sql('WHERE field IN (', [$('1'), $(2), $('three')], ')'));
});

test('literals and sql segments passed to $() in an array are preserved as such', () => {
    expect(sql('WHERE field IN (', $(['1', new Literal('2'), sql('NOW()')]), ')'))
        .toEqual(sql('WHERE field IN (', [$('1'), new Literal('2'), sql('NOW()')], ')'));
});

test('calling toString()) on a segment without escaping function yields a string with ?-placeholders', () => {
    const segment = sql('SELECT * FROM t WHERE field_a =', $(42),'AND field_b =', $('x'));
    expect(segment.toString()).toEqual('SELECT * FROM t WHERE field_a = ? AND field_b = ?');
});

test('passing an escaping function to toString() yields a respectively escaped string', () => {
   const segment = sql('SELECT * FROM t WHERE field_a =', $(42),'AND field_b =', $('x'));
   expect(segment.toString(fakeEscape))
       .toEqual('SELECT * FROM t WHERE field_a = <42> AND field_b = <x>');
});

test('parameters in a segment can be accessed via the parameters field', () => {
    const segment = sql('SELECT * FROM t WHERE field_a =', $(42),'AND field_b =', $('x'));
    expect(segment.parameters).toEqual([42, 'x']);
});

test('parameters of nested segments are concatenated', () => {
    const $selectedFields = sql('field_a, ', $(2), 'as two ,', $(3), 'as three');
    const $fromTable = sql('FROM my_table');
    const $whereCondition = sql('WHERE field_c =', $('x'));
    const segment = sql('SELECT', $selectedFields, $fromTable, $whereCondition);
    expect(segment.parameters).toEqual([2, 3, 'x']);
});
