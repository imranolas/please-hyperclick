'use babel';

// This function was lifted from the nuclide buck project. It scans the
// row where we are currently positioned row for a regex match.
// BUG: If there are multiple available matches on a line the subsequent
//      matches after the first are not recognised.
export function wordAtPosition(
  editor,
  position,
  wordRegex_: ?RegExp,
) {
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
  }

  return null;
}
