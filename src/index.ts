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

export class Value {
    public readonly value: any;

    constructor(value: any) {
        this.value = value;
    }
}

export class SqlSegment {
    public readonly fragments: readonly (Literal|Value)[];
    public readonly parameters: readonly any[];

    constructor(fragments: (Literal|Value)[]) {
        this.fragments = Object.freeze(fragments);
        this.parameters = Object.freeze(fragments.filter(s => s instanceof Value).map(s => (s as Value).value));
    }

    append(fragment: SqlSegment|Literal|Value|string): SqlSegment {
        if (typeof fragment === 'string') {
            return this.append(new Literal(fragment));
        }
        else if (fragment instanceof SqlSegment) {
            let result: SqlSegment = this;
            for (const subSegment of fragment.fragments) {
                result = result.append(subSegment);
            }
            return result;
        }
        if (this.fragments.length === 0) {
            return new SqlSegment([fragment]);
        }
        else {
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
            }
            else {
                result += fragment.value;
            }
        }
        return result;
    }
}

export function sql(...args: (Literal|Value|SqlSegment|string)[]): SqlSegment {
    let result = new SqlSegment([]);
    for (const arg of args) {
        result = result.append(arg);
    }
    return result;
}

export function $(value: any): Value {
    return new Value(value);
}
