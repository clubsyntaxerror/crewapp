function revalidateWebSite(event) {
  // Add a unique EventId to new events when called from within Google Sheets
  if (event) {
    const sheet = event.source.getActiveSheet();
    const range = event.range;

    if (sheet.getName() === "Events") {
      const row = range.getRow();

      // Skip header row
      if (row > 1) {
        const eventIdColumn = 16; // (P = 16) - moved from O
        const eventIdCell = sheet.getRange(row, eventIdColumn);
        const startDateCell = sheet.getRange(row, 1); // EventStartDateAndTime

        // Generate UUID if:
        // 1. EventId cell is empty
        // 2. EventStartDateAndTime has a value (row is not empty)
        // 3. Any cell in the row was edited
        if (!eventIdCell.getValue() && startDateCell.getValue()) {
          eventIdCell.setValue(Utilities.getUuid());
        }
      }
    }
  }

  // Always revalidate the cache even if called from a timer trigger or manually
  let response = UrlFetchApp.fetch("https://syntax-error.se/api/revalidate/");
  Logger.log(response);
}
