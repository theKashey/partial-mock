import {DeepPartial} from "./deep-partial";
import {DOES_NOT_MATTER, DO_NOT_USE, DO_NOT_CALL} from "./magic-symbols";

export type NoInfer<T> = [T][T extends any ? 0 : never];

const A_REAL_INSTANCE = Symbol();

const join = (a: string, b: string) => a ? `${a}.${b}` : b;

type RefsMap = WeakMap<any, Record<string, any>>;

const getReal = (a: any) => a[A_REAL_INSTANCE] ?? a;

const proxify = (refs: RefsMap, target: any, extras: any, suffix: string, report: (name: string) => void) => {
    const ref = refs.get(target) || {};
    if (ref[suffix]) {
        return ref[suffix];
    }

    const followProp = (value: any, name: string, extras = value): any => {
        report(name);
        if (typeof value === 'object' &&
            // value.then &&
            value instanceof Promise) {
            return value.then(res => followProp(res, name, {then: DOES_NOT_MATTER}))
        }

        if (Array.isArray(value) ||
            typeof value === 'object' ||
            typeof value === 'function'
        ) {
            return proxify(refs, value, extras, name, report)
        }
        return value;
    }

    ref[suffix] = new Proxy(target, {
        set(name) {
            throw new Error(`attempt to set ${join(suffix, name)} to a read only mock`)
        },
        apply(fn, thisArg, argumentsList) {
            if (fn === DO_NOT_CALL) {
                throw new Error(`key ${suffix} was configured as DO_NOT_CALL`)
            }
            const realThis = getReal(thisArg);
            return followProp(Reflect.apply(fn, realThis, argumentsList), `${suffix}()`);
        },
        get(_target, prop) {
            if (prop === A_REAL_INSTANCE) {
                return target;
            }
            const value = target[prop];
            if (typeof prop !== "string") {
                return value;
            }
            if (value === DOES_NOT_MATTER) {
                return undefined;
            }
            if (value === DO_NOT_USE) {
                throw new Error(`key ${join(suffix, prop)} was configured as DO_NOT_USE`)
            }
            if (!(prop in target) && !(prop in extras)) {
                throw new Error(`reading partial key ${join(suffix, prop)} not defined in mock`)
            }
            return followProp(value, join(suffix, prop));
        },
    });
    return ref[suffix];
}

const mockRegistry = new WeakMap<any, {
    getUsage(): Set<string>;
    resetUsage(): void;
    getReal(): any,
}>();

/**
 * @returns keyed location used in mock
 */
export const getKeysUsedInMock = (mock: any): string[] => {
    const record = mockRegistry.get(mock);
    if (!record) {
        throw new Error('trying get usage for non mock');
    }
    return Array.from(record.getUsage());
}

/**
 * resets usage tracking
 */
export const resetMockUsage = (mock: any) => {
    const record = mockRegistry.get(mock);
    if (!record) {
        throw new Error('trying reset usage for non mock');
    }
    return record.resetUsage();
}

const getDeepKeys = (obj: any): string[] => {
    const keys: string[] = [];
    for (let key in obj) {
        const value = obj[key];
        if (value !== undefined && value !== DOES_NOT_MATTER) {
            keys.push(key);
        }
        if (typeof obj[key] === "object") {
            keys.push(...getDeepKeys(obj[key]).map(subkey => `${key}.${subkey}`));
        }
    }
    return keys;
}
/**
 * Expects a "Minimum Viable Mock" with all provided values to be read
 * @throws in case of some information being used
 * @see {@link resetMockUsage} and {@link getKeysUsedInMock}
 *
 * @param mock - a mock created by {@link partialMock}
 */
export const expectNoUnusedKeys = (mock: any) => {
    const record = mockRegistry.get(mock);
    if (!record) {
        throw new Error('trying get usage for non mock');
    }
    const usage = record.getUsage();
    const knownKeys = getDeepKeys(record.getReal());

    const unusedKeys = knownKeys.filter(key => !usage.has(key));
    if (unusedKeys.length) {
        console.error('unused keys:', unusedKeys);
        throw new Error('You have defined a larger object than you use. Unused keys ' + unusedKeys.join(', '))
    }
}

/**
 * Creates a deep partial mock for a given type with build in _under-mocking_ tracking
 *
 * @see combine with {@link expectNoUnusedKeys} for _over-mocking_ tracking
 *
 * @remarks magic symbols for access control:
 * - {@link DOES_NOT_MATTER} - allows access to a field, but holds no value
 * - {@link DO_NOT_USE} - prevents access to a field
 * - {@link DO_NOT_CALL} - prevents call of a method
 *
 * @param mock
 * @returns Proxy over original object
 */
export const partialMock = <T, >(input: DeepPartial<NoInfer<T>>): T => {
    const usageList = new Set<string>();
    const mock = proxify(new WeakMap(), input, input, '', (name) => usageList.add(name));
    mockRegistry.set(mock, {
        getReal: () => input,
        getUsage: () => usageList,
        resetUsage: () => {
            usageList.clear();
        },
    });
    return mock;
}

/**
 * creates exact mock with usage tracking and magic symbols support
 * @see {@link partialMock} for details
 */
export const exactMock = <T, >(input: NoInfer<T>): T => partialMock(input as any);