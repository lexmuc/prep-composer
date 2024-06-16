export class Literal {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    ensureTrailingSpace(): Literal {
        return this.value.endsWith(' ') ? this : new Literal(this.value + ' ');
    }

    ensureLeadingSpace(): Literal {
        return this.value.startsWith(' ') ? this : new Literal(' ' + this.value);
    }

    mergeWith(other: Literal): Literal {
        const maybeSpace = this.value.endsWith(' ') || other.value.startsWith(' ') ? '' : ' ';
        return new Literal(this.value + maybeSpace + other.value);
    }
}

// Used to extract an identifier that is wrapped in a Proxy object
const unwrapSymbol = Symbol('unwrap');

const escapeIdentifier = (p: string) => "`" + p.replace(/`/g, "``") + "`";

export class Identifier {
    constructor(readonly parts: string[]) {
    }

    append(s: string): Identifier {
        return new Identifier([...this.parts, s]);
    }

    toLiteral(): Literal {
        return new Literal(this.parts.map(p => escapeIdentifier(p)).join('.'));
    }
}

export class Value {
    public readonly value: any;

    constructor(value: any) {
        this.value = value;
    }
}

type Fragment = Literal | Value | SqlSegment | Identifier | string;

export class SqlSegment {
    public readonly fragments: readonly (Literal | Value)[];
    public readonly parameters: readonly any[];

    constructor(fragments: (Literal | Value)[]) {
        this.fragments = Object.freeze(fragments);
        this.parameters = Object.freeze(fragments.filter(s => s instanceof Value).map(s => (s as Value).value));
    }

    append(fragment: Fragment | Fragment[]): SqlSegment {
        if (typeof fragment === 'string') {
            return this.appendPrimitiveSegmentWithPadding(new Literal(fragment));
        } else if (fragment instanceof SqlSegment) {
            let result: SqlSegment = this;
            for (const subSegment of fragment.fragments) {
                result = result.append(subSegment);
            }
            return result;
        } else if (fragment instanceof Identifier) {
            // @ts-ignore
            return this.appendPrimitiveSegmentWithPadding(fragment[unwrapSymbol]);
        }
        else if (fragment instanceof Array) {
            let result: SqlSegment = this;
            let index = 0;
            for (const subFragment of fragment) {
                if (index !== 0) {
                    result = result.appendLiteralWithoutPadding(new Literal(', '));
                }
                result = result.append(subFragment);
                index++;
            }
            return result;
        }
        else {
            return this.appendPrimitiveSegmentWithPadding(fragment);
        }
    }

    appendPrimitiveSegmentWithPadding(fragment: Literal | Value): SqlSegment {
        if (this.fragments.length === 0) {
            return new SqlSegment([fragment]);
        } else {
            const allButLatest = this.fragments.slice(0, this.fragments.length - 1);
            const latest = this.fragments[this.fragments.length - 1];
            if (latest instanceof Literal && !(fragment instanceof Literal)) {
                return new SqlSegment([...allButLatest, latest.ensureTrailingSpace(), fragment]);
            }
            if (!(latest instanceof Literal) && fragment instanceof Literal) {
                return new SqlSegment([...allButLatest, latest, fragment.ensureLeadingSpace()]);
            }
            if (latest instanceof Literal && fragment instanceof Literal) {
                return new SqlSegment([...allButLatest, latest.mergeWith(fragment)]);
            } else {
                return new SqlSegment([...allButLatest, latest, fragment]);
            }
        }
    }

    appendLiteralWithoutPadding(fragment: Literal): SqlSegment {
        if (this.fragments.length === 0) {
            return new SqlSegment([fragment]);
        } else {
            const allButLatest = this.fragments.slice(0, this.fragments.length - 1);
            const latest = this.fragments[this.fragments.length - 1];
            if (latest instanceof Literal) {
                return new SqlSegment([...allButLatest, new Literal(latest.value + fragment.value)]);
            }
            else {
                return new SqlSegment([...allButLatest, latest, fragment]);
            }
        }
    }

    toString(escapeFn?: (value: any) => string): string {
        let result = '';
        for (const fragment of this.fragments) {
            if (fragment instanceof Value) {
                result += escapeFn ? escapeFn(fragment.value) : '?';
            } else {
                result += fragment.value;
            }
        }
        return result;
    }
}

export function sql(...args: (Fragment|Fragment[])[]): SqlSegment {
    let result = new SqlSegment([]);
    for (const arg of args) {
        result = result.append(arg);
    }
    return result;
}

const makeValue: (value: any) => (Value | Fragment[]) = (value: any) => {
    if (value instanceof Array) {
        let result = [];
        for (const subValue of value) {
            if (subValue instanceof Literal || subValue instanceof SqlSegment) {
                result.push(subValue);
            } else {
                result.push(new Value(subValue));
            }
        }
        return result;
    }
    else {
        return new Value(value);
    }
}

// We apply a Proxy to makeValue() to intercept property access ($[...] syntax for identifiers) and expose it as $.
// As a result, $ can be used with normal brackets to create a value and with square brackets to create an identifier.
// Identifiers can be chained by wrapping the new identifier in another Proxy. The unwrap symbol is used to extract
// the identifier from the Proxy object. The identifier is then turned into a literal with backticks.
export const $ = new Proxy(makeValue, {
    get(target: any, p: any, receiver: any): any {
        return wrapWithProxy(new Identifier([p]));
    },
});

function wrapWithProxy(target: Identifier) {
    return new Proxy(target, {
        get(target: any, p: any, receiver: any): any {
            if (p === unwrapSymbol) {
                return target.toLiteral();
            } else {
                return wrapWithProxy(target.append(p));
            }
        }
    });
}
