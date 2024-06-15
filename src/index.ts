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

// used to extract an identifier from a WrappedIdentifier (wrapped in a Proxy)
const unwrapSymbol = Symbol('unwrap');

const escapeIdentifier = (p: string) => "`" + p.replace(/`/g, "``") + "`";

export class WrappedIdentifier {
    constructor(readonly parts: string[]) {
    }

    append(s: string): WrappedIdentifier {
        return new WrappedIdentifier([...this.parts, s]);
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

export class SqlSegment {
    public readonly fragments: readonly (Literal | Value)[];
    public readonly parameters: readonly any[];

    constructor(fragments: (Literal | Value)[]) {
        this.fragments = Object.freeze(fragments);
        this.parameters = Object.freeze(fragments.filter(s => s instanceof Value).map(s => (s as Value).value));
    }

    append(fragment: SqlSegment | Literal | Value | WrappedIdentifier | string): SqlSegment {
        if (typeof fragment === 'string') {
            return this.append(new Literal(fragment));
        } else if (fragment instanceof SqlSegment) {
            let result: SqlSegment = this;
            for (const subSegment of fragment.fragments) {
                result = result.append(subSegment);
            }
            return result;
        } else if (fragment instanceof WrappedIdentifier) {
            // @ts-ignore
            return this.append(fragment[unwrapSymbol]);
        }
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

export function sql(...args: (Literal | Value | SqlSegment | WrappedIdentifier | string)[]): SqlSegment {
    let result = new SqlSegment([]);
    for (const arg of args) {
        result = result.append(arg);
    }
    return result;
}

const makeValue = (value: any) => new Value(value);

// We apply a Proxy to makeValue() to intercept property access ($[...] syntax for identifiers) and expose it as $.
// Identifiers can be chained by wrapping the identifier in a new Proxy. WrappedIdentifier|s can be unwrapped to
// literals.
export const $ = new Proxy(makeValue, {
    get(target: any, p: any, receiver: any): any {
        return wrapWithProxy(new WrappedIdentifier([p]));
    },
});

function wrapWithProxy(target: WrappedIdentifier) {
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
