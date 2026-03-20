// @ts-ignore
import { something } from "./local";
import { readFileSync } from "node:fs";

function log(target: any, context: ClassDecoratorContext) {
    return target;
}

@log
class MyService {
    name = "service";
}

export { readFileSync, something, MyService };
