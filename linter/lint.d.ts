declare namespace JsonToAst {
  export interface AstPosition {
      line: number;
      column: number;
      offset: number;
  }

  export interface AstLocation {
      start: AstPosition;
      end: AstPosition;
  }
}

export interface LinterProblem {
  key: string;
  error: string;
  loc: JsonToAst.AstLocation;
}

export declare function lint (str: string): LinterProblem[];
export declare function parse (str: string): Object;
