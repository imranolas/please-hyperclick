'use babel';
import {Range} from 'atom';

export function wordAtPosition(
  editor: atom$TextEditor,
  position: atom$Point,
  wordRegex_: ?RegExp,
): ?{wordMatch: Array<string>, range: atom$Range} {
  let wordRegex = wordRegex_;
  if (!wordRegex) {
    wordRegex = editor.getLastCursor().wordRegExp();
  }
  const buffer = editor.getBuffer();
  const {row, column} = position;
  const rowRange = buffer.rangeForRow(row);
  let matchData;
  // Extract the expression from the row text.
  buffer.scanInRange(wordRegex, rowRange, data => {
    const {range} = data;
    if (range.containsPoint(position)) {
      matchData = data;
    }
    // Stop the scan if the scanner has passed our position.
    if (range.end.column > column) {
      data.stop();
    }
  });
  if (matchData) {
    return {
      wordMatch: matchData.match,
      range: matchData.range,
    };
  } else {
    return null;
  }
}
