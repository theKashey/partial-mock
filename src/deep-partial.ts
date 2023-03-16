type DeepPartialObject<Type> = {
    [Key in keyof Type]?: DeepPartial<Type[Key]>;
};


// Adapted from type-fest's PartialDeep + react-magnetic-di
/**
 * A deep partial on Array/Object/Tuple/Function/Promise
 */
export type DeepPartial<Type> = Type extends ReadonlyArray<infer InferredArrayMember>
    ? InferredArrayMember[] extends Type
        ? readonly InferredArrayMember[] extends Type
            ? ReadonlyArray<DeepPartial<InferredArrayMember>> // readonly list
            : Array<DeepPartial<InferredArrayMember>> // mutable list
        : DeepPartialObject<Type> // tuple
    : Type extends Set<infer SetType> ? Set<DeepPartial<SetType>>
        : Type extends Map<infer MapArg, infer MapType> ? Map<DeepPartial<MapArg>, DeepPartial<MapType>>
            : Type extends (...args: infer FunctionalArgs) => infer ReturnType
                ? (...args: FunctionalArgs) => DeepPartial<ReturnType>
                : Type extends Promise<infer InferredPromiseType>
                    ? Promise<DeepPartial<InferredPromiseType>> // promise
                    : Type extends object
                        ? DeepPartialObject<Type> // everything
                        : Type | undefined;

/**
 * A deep partial on a function(stub) return type
 */
export type DeepPartialStub<Type extends (...args: any[]) => any> =
    Type extends (...args: infer FunctionalArgs) => infer ReturnType ? (...args: FunctionalArgs) => DeepPartial<ReturnType> : never;