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

import { ExampleConfiguration } from './configuration';
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

function GetSeverity(key: string): DiagnosticSeverity | undefined {
  if (!conf || !conf.severity) {
      return undefined;
  }

  const severity: string = conf.severity[key].typeError;

  switch (severity) {
      case "Error":
          return DiagnosticSeverity.Error;
      case "Warning":
          return DiagnosticSeverity.Warning;
      case "Information":
          return DiagnosticSeverity.Information;
      case "Hint":
          return DiagnosticSeverity.Hint;
      default:
          return undefined;
  }
}

function GetMessage(key: string): string {
  if (!conf || !conf.severity) {
    return `Unknown problem type '${key}'`;
  }

  const description: string = conf.severity[key].description;

  if (!description) {
    return `Unknown problem type '${key}'`;
  }

  return description;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const source = basename(textDocument.uri);
  const json = textDocument.getText();

  const diagnostics = lint(json).reduce(
    (
      list: Diagnostic[],
      problem
    ): Diagnostic[] => {
      const severity = GetSeverity(problem.key);

      if (severity) {
        const message = GetMessage(problem.key);

        const diagnostic: Diagnostic = {
          range: {
            start: textDocument.positionAt(
              problem.loc.start.offset
            ),
            end: textDocument.positionAt(problem.loc.end.offset)
          },
          severity,
          message,
          source
        };
  
        list.push(diagnostic);
      }

      return list;
    },
    []
  );

  conn.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  
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
