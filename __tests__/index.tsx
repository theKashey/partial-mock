import {partialMock} from '../src';
import {
    DOES_NOT_MATTER,
    getKeysUsedInMock,
    resetMockUsage,
    expectNoUnusedKeys,
    DO_NOT_CALL,
    DO_NOT_USE
} from '../src';

describe('partial mocks', () => {
    it('simple one level values', () => {
        const x = {
            a: 1,
            b: 2,
            longField: 3,
        } as const;
        partialMock<typeof x>({a: 1});
        partialMock<typeof x>({b: 2});
        partialMock<typeof x>({longField: 3});
        // @ts-expect-error
        partialMock<typeof x>({a: 2});
        // @ts-expect-error
        partialMock<typeof x>({notExisting: 2});

        expect(partialMock<typeof x>({a: 1}).a).toBe(1);
        expect(() => partialMock<typeof x>({a: 1}).b).toThrow();
    });

    it('allows random access', () => {
        const x = {
            a: 1,
            b: 'some',
            c: 'matters',
        } as const;
        expect(partialMock<typeof x>({a: 1}).a).toBe(1);
        expect(partialMock<typeof x>({b: DOES_NOT_MATTER}).b).toBe(undefined);
        expect(() => partialMock<typeof x>({a: 1}).c).toThrow();
    });

    it('functional mocks', () => {
        const x = {
            onClick(_event: string) {
                return {a: 1, b: 2};
            },
        } as const;
        partialMock<typeof x>({onClick: () => ({})});
        // @ts-expect-error
        partialMock<typeof x>({onClick: () => ({c: 1})});

        const exampleFn = partialMock<typeof x>({onClick: () => ({b: 2})});
        expect(exampleFn.onClick('23').b).toBe(2);
        expect(() => exampleFn.onClick('23').a).toThrow();
    });

    it('promise mocks', async () => {
        const x = {
            a: Promise.resolve({x: 1, y: 2}),
            async fetch() {
                return {a: 1, b: 2};
            },
        } as const;
        partialMock<typeof x>({a: Promise.resolve({x: 1})});
        partialMock<typeof x>({fetch: () => Promise.resolve({a: 1})});

        // @ts-expect-error
        partialMock<typeof x>({a: Promise.resolve({z: 1})});

        const exampleFn = partialMock<typeof x>({fetch: () => Promise.resolve({a: 1})});

        const payload = await exampleFn.fetch();
        expect(payload.a).toBe(1);
        expect(() => payload.b).toThrow();
    });

    it('set mocks', async () => {
        const x = {
            a: new Set([{x: 1, y: 1}]),
        } as const;
        // @ts-expect-error
        partialMock<typeof x>({a: new Set([{z: 1}])});
        const values = [...partialMock<typeof x>({a: new Set([{x: 1}])}).a.values()];
        expect(values[0].x).toBe(1);
        expect(() => values[0].y).toThrow();
    });

    it('map mocks', async () => {
        const x = {
            a: new Map([['key', {x: 1, y: 1}]]),
        } as const;
        // @ts-expect-error
        partialMock<typeof x>({a: new Map([[1, {x: 1, y: 1}]])});
        // @ts-expect-error
        partialMock<typeof x>({a: new Map([['1', {z: 1}]])});

        const value = partialMock<typeof x>({a: new Map([['key', {x: 1}]])}).a.get('key');
        expect(value?.x).toBe(1);
        expect(() => value?.y).toThrow();
    });

    it('tracking test', async () => {
        const x = {
            a: {b: {c: 1, d: 1}},
            s: new Set([{x: 1, y: 1}]),
            async fetch() {
                return {a: 1, b: 2};
            }
        };// as const;
        const mock = partialMock<typeof x>(x);
        expect(getKeysUsedInMock(mock)).toEqual([]);
        expect(() => mock.a.b.c = 2).toThrow();
        expect(getKeysUsedInMock(mock)).toEqual(['a', 'a.b']);
        resetMockUsage(mock);
        const promise = mock.fetch();
        expect(getKeysUsedInMock(mock)).toEqual(['fetch', 'fetch()']);
        resetMockUsage(mock);
        (await promise).b;
        expect(getKeysUsedInMock(mock)).toEqual(['fetch()', 'fetch().then', 'fetch().b']);
    });

    it('usage test', async () => {
        const x = {
            a: {b: {c: 1, d: 1}},
            b: 1,
        } as const;
        const mock = partialMock<typeof x>(x);
        expect(mock.a.b.c).toBe(1);
        expect(() => expectNoUnusedKeys(mock)).toThrow();
        expect(mock.a.b.d).toBe(1);
        expect(() => expectNoUnusedKeys(mock)).toThrow();
        expect(mock.b).toBe(1);
        expect(() => expectNoUnusedKeys(mock)).not.toThrow();
    })

    it('array usage test', async () => {
        const x = {
            a: [undefined, 1],
            b: DOES_NOT_MATTER,
        } as const;
        const mock1 = partialMock<typeof x>(x);
        // side effect
        mock1.a[1];
        expect(() => expectNoUnusedKeys(mock1)).not.toThrow();

        const mock2 = partialMock<typeof x>(x);
        const [, _y] = mock2.a;
        expect(() => expectNoUnusedKeys(mock2)).not.toThrow();
    })

    it('usage limitation test', async () => {
        const x = {
            fn() {
                return {x: 1}
            }
        };// as const;
        const mock = partialMock<typeof x>(x);
        expect(() => expectNoUnusedKeys(mock)).toThrow();
        mock.fn();
        // tracking is not working beyond function calls
        expect(() => expectNoUnusedKeys(mock)).not.toThrow();
    })

    it('DO_NOT tests', () => {
        const x = {
            fn() {

            },
            x: 1,
            y: 2,
            z: Promise.resolve(null),
            w: false,
        } as const;
        const mock = partialMock<typeof x>({
            fn: DO_NOT_CALL,
            x: DO_NOT_USE,
            y: 2,
            z: DOES_NOT_MATTER
        });
        // should pass
        expect( mock.fn).toBeTruthy()
        expect(() => mock.fn()).toThrow();
        expect(() => mock.x).toThrow();
        expect( mock.y).toBe(2);
        expect( mock.z).toBe(undefined);
        expect(() => mock.w).toThrow()
    })
});
