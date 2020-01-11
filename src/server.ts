import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  InitializeParams,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationParams
} from 'vscode-languageserver';

import { basename } from 'path';

import { ExampleConfiguration} from './configuration';
import { lint } from '../linter/lint';

let conn = createConnection(ProposedFeatures.all);
let docs = new TextDocuments();
let conf: ExampleConfiguration | undefined = undefined;

conn.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: docs.syncKind,
      resolveProvider: true
    }
  };
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const source = basename(textDocument.uri);
  const json = textDocument.getText();

  const diagnostics = lint(json).reduce(
    (
      list: Diagnostic[],
      problem
    ): Diagnostic[] => {

      let diagnostic: Diagnostic = {
        range: {
          start: textDocument.positionAt(
            problem.loc.start.offset
          ),
          end: textDocument.positionAt(problem.loc.end.offset)
        },
        severity: DiagnosticSeverity.Error,
        message: problem.error,
        source
      };

      list.push(diagnostic);


      return list;
    },
    []
  );


  if (diagnostics.length) {
    conn.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }
}

async function validateAll() {
  for (const document of docs.all()) {
    await validateTextDocument(document);
  }
}

docs.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

conn.onDidChangeConfiguration(({ settings }: DidChangeConfigurationParams) => {
  conf = settings.example;
  validateAll();
});

docs.listen(conn);
conn.listen();
