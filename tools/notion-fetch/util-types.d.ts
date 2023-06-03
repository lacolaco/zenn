declare type ElementType<T> = T extends (infer U)[] ? U : never;

declare type MatchType<T, U, V = never> = T extends U ? T : V;
