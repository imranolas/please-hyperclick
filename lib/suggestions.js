'use babel';

import path from 'path';
import fs from 'fs';
import {wordAtPosition} from './range';
import escapeStringRegExp from 'escape-string-regexp';

/**
 * Takes target regex match and file path where given target is found as
 * arguments.
 * Returns target as object with path and name properties.
 * For example, input match
 * ['//Apps/MyApp:MyTarget', '//Apps/MyApp', 'MyTarget'] would be parsed to
 * {path: //Apps/MyApp/BUILD, name: MyTarget} and ':MyTarget' would be
 * parsed to {path: filePath, name: MyTarget}.
 * Returns null if target cannot be parsed from given arguments.
 */
async function parseTarget(
  match: Array<?string> | Array<string>,
  filePath: string,
  projectRoot: string,
) {
  if (!match || !filePath) {
    return null;
  }

  let targetPath;
  const fullTarget = match[1];
  if (fullTarget) {
    // Strip off the leading slashes from the fully-qualified build target.
    const basePath = fullTarget.substring('//'.length);
    targetPath = path.join(projectRoot, basePath, 'BUILD');
  } else {
    // filePath is already an absolute path.
    targetPath = filePath;
  }
  const name = match[2];
  if (!name) {
    return null;
  }
  return {targetPath, name};
}

/**
 * Takes a target as an argument.
 * Returns a Promise that resolves to a target location.
 * If the exact position the target in the file cannot be determined
 * position property of the target location will be set to null.
 * If `target.path` file cannot be found or read, Promise resolves to null.
 */
async function findTargetLocation(target: {targetPath: string, name: string}): Promise<any> {
  let data;
  try {
    data = fs.readFileSync(target.targetPath).toString('utf8');
  } catch (e) {
    return null;
  }

  // We split the file content into lines and look for the line that looks
  // like "name = '#{target.name}'" ignoring whitespaces and trailling
  // comma.
  const lines = data.split('\n');
  const regex = new RegExp(
      '^\\s*' + // beginning of the line
      'name\\s*=\\s*' + // name =
      '[\'"]' + // opening quotation mark
      escapeStringRegExp(target.name) + // target name
      '[\'"]' + // closing quotation mark
      ',?$', // optional trailling comma
  );

  let lineIndex = 0;
  lines.forEach((line, i) => {
    if (regex.test(line)) {
      lineIndex = i;
    }
  });

  return {path: target.targetPath, line: lineIndex, column: 0};
}

const VALID_BUILD_FILE_NAMES = new Set([
  'BUILD',
]);

const hasPlzConfig = (filePath) => {
  if (path.basename(filePath) === '') {
    return null;
  }

  const isDir = fs.statSync(filePath).isDirectory();
  const dir = isDir ? filePath : path.dirname(filePath);
  const files = new Set(fs.readdirSync(dir));
  if (files.has('.plzconfig')) {
    return dir;
  }

  const parentDir = path.resolve(dir, '..');
  return hasPlzConfig(parentDir);
};

function goToLocation(filename, line, column) {
  atom.workspace.open(filename)
    .then((editor) => editor.setCursorBufferPosition([line, column]));
}

export default {
  priority: 200,
  providerName: 'please-hyperclick',
  async getSuggestion(textEditor, position): Promise<mixed> {
    const absolutePath = textEditor.getPath();
    if (absolutePath === null) {
      return null;
    }

    // Check that we're dealing with BUILD file.
    const baseName = path.basename(absolutePath);
    if (!VALID_BUILD_FILE_NAMES.has(baseName)) {
      return null;
    }

    const projectRoot = hasPlzConfig(absolutePath);
    if (!projectRoot) {
      return null;
    }

    const results = await Promise.all([
      findBuildTarget(textEditor, position, absolutePath, projectRoot),
      findRelativeFilePath(textEditor, position, path.dirname(absolutePath)),
    ]);

    const hyperclickMatch = results.find(x => x !== null);

    if (hyperclickMatch !== null) {
      const match = hyperclickMatch;
      return {
        range: match.range,
        callback() {
          goToLocation(match.path, match.line, match.column);
        },
      };
    }

    return null;
  },
  parseTarget,
  findTargetLocation,
};

type HyperclickMatch = {
  path: string,
  line: number,
  column: number,
  range: Array<number, number>,
};

const TARGET_REGEX = /(\/(?:\/[\w\-\.]*)*){0,1}:([\w\-\.]+)/;

/**
 * @return HyperclickMatch if (textEditor, position) identifies a build target.
 */
async function findBuildTarget(
  textEditor,
  position,
  absolutePath: string,
  projectRoot: string,
): Promise<?HyperclickMatch> {
  const wordMatchAndRange = wordAtPosition(textEditor, position, TARGET_REGEX);
  if (wordMatchAndRange === null) {
    return null;
  }

  const {wordMatch, range} = wordMatchAndRange;

  const target = await parseTarget(wordMatch, absolutePath, projectRoot);
  if (target === null) {
    return null;
  }

  const location = await findTargetLocation(target);
  if (location !== null) {
    return {...location, range};
  }

  return null;
}

const RELATIVE_FILE_PATH_REGEX = /(['"])(.*)(['"])/;

/**
 * @return HyperclickMatch if (textEditor, position) identifies a file path that resolves to a file
 *   under the specified directory.
 */
async function findRelativeFilePath(
  textEditor,
  position,
  directory: string,
): Promise<?HyperclickMatch> {
  const wordMatchAndRange = wordAtPosition(textEditor, position, RELATIVE_FILE_PATH_REGEX);
  if (!wordMatchAndRange) {
    return null;
  }
  const {wordMatch, range} = wordMatchAndRange;

  // Make sure that the quotes match up.
  if (wordMatch[1] !== wordMatch[3]) {
    return null;
  }

  const potentialPath = path.join(directory, wordMatch[2]);
  let stat;
  try {
    stat = fs.statSync(potentialPath);
  } catch (e) {
    return null;
  }

  if (stat.isFile()) {
    return {
      path: potentialPath,
      line: 0,
      column: 0,
      range,
    };
  }

  return null;
}
