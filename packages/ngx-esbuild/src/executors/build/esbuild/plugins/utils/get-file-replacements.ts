import { FileReplacement } from '@angular-devkit/build-angular/src/builders/browser/schema';
import assert from 'node:assert';
import path from 'node:path';

export function getFileReplacements(
  angularFileReplacements: FileReplacement[],
  cwd: string
): Record<string, string> {
  return Object.fromEntries(
    angularFileReplacements.map((fileReplacement) => {
      assert(
        fileReplacement.replace,
        'File replacement must have a `replace` property'
      );
      assert(
        fileReplacement.with,
        'File replacement must have a `with` property'
      );
      return [
        path.join(cwd, fileReplacement.replace),
        path.join(cwd, fileReplacement.with),
      ];
    })
  );
}
