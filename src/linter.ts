import * as jsonToAst from "json-to-ast";
import { lint } from "../linter/lint";

export type JsonAST = jsonToAst.AstJsonEntity | undefined;

export interface LinterProblem<TKey> {
    key: TKey;
    loc: jsonToAst.AstLocation;
}

export function makeLint<TProblemKey>( json: string): LinterProblem<TProblemKey>[] {

    console.log(lint(json));
    return lint(json);
}
