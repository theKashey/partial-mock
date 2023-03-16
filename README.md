👯partial-mock

====

Proxy-base, testing-framework-independent solution to solve _overmocking_, and _undermocking_.
Never provide more information than you should, never provide less.

- solves the 'as' problem in TypeScript tests when an inappropriate object is used as a mock
- ensures provided mocks are suitable for the test case

```bash
npm add --dev partial-mock
```

## Problem statement
```tsx
type User = {
  id: string;
  name: string;
  // Imagine oodles of other properties...
};

const getUserId = (user:User) => user.id;

it("Should return an id", () => {
  getUserId({
    id: "123", // I really dont need anything more
  } as User /* 💩 */);
});

// ------

// solution 1 - correct your CODE
const getUserId = (user:Pick<User,'id'>) => user.id;

getUserId({
   id: "123", // nothing else is required
});

// solution 2 - correct your TEST
it("Should return an id", () => {
    getUserId(partialMock({
        id: "123", // it's ok to provide "partial data" now
    }));
});
// Example was adopted from `mock-utils`
```
But what will happen with solution 2 in time, when internal implementation of getUserId change? 
```tsx
const getUserId = (user:User) => user.uid ? user.uid : user.id;
```
This is where `partial-mock` will save the day as it will break your test
> 🤯Error: reading partial key .uid not defined in mock


```tsx
import {partialMock} from 'partial-mock';

// complexFunction = () => ({ 
//   complexPart: any, 
//   simplePart: boolean, 
//   rest: number
// });

jest.mocked(complexFunction).mockReturnValue(
    partialMock({simpleResult: true, rest: 1})
);

// as usual
complexFunction().simpleResult // ✅=== true

// safety for undermocking
complexFunction().complexPart  // 🤯 run time exception - field is not defined

import {partialMock, expectNoUnusedKeys} from 'partial-mock';
// safety for overmocking
expectNoUnusedKeys(complexFunction()) // 🤯 run time exception - rest is not used
```

# API
- `partialMock(mock) -> mockObject` - to create partial mock (TS + runtime)
- `exactMock(mock) -> mockObject` - to create monitored mock (runtime)
- `expectNoUnusedKeys(mockObject)` - to control overmocking
- `getKeysUsedInMock(mockObject)`, `resetMockUsage(mockObject)` - to better understand usage
- `DOES_NOT_MATTER`, `DO_NOT_USE`, `DO_NOT_CALL` - magic symbols, see below


# Theory
## Definition of overmocking
[Overtesting](https://portal.gitnation.org/contents/overtesting-why-it-happens-and-how-to-avoid-it) is a symptom of tests doing more than they should and thus brittle.
A good example here is Snapshots capturing a lot of unrelated details, while you might want to focus on something particular.
The makes tests more sensitive and brittle.

`Overmocking` is the same - you might need to create and maintain complex mock, while in fact a little part of it is used.
This makes tests more complicated and more expensive to write for no reason.

> (Deep) Partial Mocking for the rescue! 🥳

Example:
```tsx
const complexFunction = () => ({
    doA():ComplexObject,
    doB():ComplexObject,
});

// direct mock
const complexFunctionMock = () => ({
    doA():ComplexObject,
    doB():ComplexObject,
});

// partial mock
const complexFunctionPartialMock = () => ({
    doA():{ singleField: boolean },
});
```

And there are many usecases when such mocks are more than helpful, until they cause `Undermocking`

## Definition of undermocking

Right after doing over-specification, one can easily experience under-specification - too narrow mocks altering testing behavior without anyone noticing.

> ⚠️ partial-mock will throw an exception if code is trying to access not provided functionality

A little safety net securing correct behavior.

If you dont want to provide any value - use can use `DOES_NOT_MATTER` magic symbol.

```tsx
import {partialMock, DOES_NOT_MATTER} from "partial-mock";

const mock = partialMock({
    x: 1,
    then: DOES_NOT_MATTER
});
Promise.resolve(mock);
// promise resolve will try to read mock.then per specification
// but it "DOES_NOT_MATTER"
```

`DOES_NOT_MATTER` is one of magic symbols:
- `DOES_NOT_MATTER` - defines a key without a value. It is just more _semantic_ than setting key to `undefined`.
- `DO_NOT_USE` - throws on field access. Handy to create a "trap" and ensure expected behavior. Dont forget that partial-mock will throw in any case on undefined field access.
- `DO_NOT_CALL` - throws on method invocation. Useful when you need to allow method access, but not usage.

## Non partial mocks
Partial mocks are mostly TypeScript facing feature. The rest is a proxy-powered javascript runtime.
And that runtime, especially with magic symbol defined above, can be useful for other cases.

For situation like this use `exactMock`

# Inspiration
This library is a mix of ideas from:
- [react-magnetic-di](https://github.com/albertogasparin/react-magnetic-di) - mocking solution with built-in partial support. Partial-mock is reimplementation of their approach for general mocking.
- [mock-utils](https://github.com/mattpocock/mock-utils) - typescript solution for partial mocks. Partial-mocks implements the same idea but adds runtime logic for over and under mocking protection. 
- [rewiremock](https://github.com/theKashey/rewiremock) - dependnecy mocking solution with over/under mocking protection (isolation/reverse isolation)
- [proxyequal](https://github.com/theKashey/proxyequal) - proxy based usage tracking

# Licence
MIT