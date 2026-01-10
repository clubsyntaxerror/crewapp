import { generateAccessToken } from './google-auth';
import { CrewTask, Event } from './types';

const SHEET_ID = process.env.EXPO_PUBLIC_GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.EXPO_PUBLIC_GOOGLE_SHEET_NAME || 'Events';
const DEFAULT_TASK_LIST = 'H62';

const H62_ADDRESS = 'Hornsgatan 62, 11821 Stockholm';

function parseSheetRow(row: string[]): Event | null {
  // Skip rows without required data (startDate, venueName, eventId)
  if (!row[0] || !row[2] || !row[15]) return null;

  try {
    const venueName = row[2];
    const providedAddress = row[8];

    // Use H62 default address if venue is H62 and no address provided
    const streetAddress = providedAddress ||
      (venueName === 'H62' ? H62_ADDRESS : undefined);

    return {
      eventId: row[15], // EventId (moved to column P)
      startDate: new Date(row[0]), // EventStartDateAndTime
      endDate: new Date(row[1]), // EventEndDateAndTime
      venueName, // VenueName
      coverFee: row[3] || undefined, // OptionalCoverFee
      title: row[4] || venueName, // OptionalEventTitle, fallback to venue name
      description: row[5] || undefined, // OptionalEventDescription
      ticketsTitle: row[6] || undefined, // OptionalCallToActionTitle
      ticketsUrl: row[7] || undefined, // OptionalCallToActionUrl
      streetAddress,
      facebookUrl: row[9] || undefined, // OptionalFacebookEventUrl
      ageLimit: row[10] || undefined, // OptionalAgeLimit
      hideFromHero: row[11]?.toLowerCase() === 'true',
      payingGuests: row[12] ? parseInt(row[12], 10) : undefined,
      nonPayingGuests: row[13] ? parseInt(row[13], 10) : undefined,
      taskListName: row[14] || undefined, // OptionalTaskListName (new column O)
    };
  } catch (error) {
    console.error('Error parsing row:', error);
    return null;
  }
}

export async function fetchEvents(): Promise<Event[]> {
  if (!SHEET_ID) {
    throw new Error('EXPO_PUBLIC_GOOGLE_SHEET_ID is not configured');
  }

  const privateKey = process.env.EXPO_PUBLIC_GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Service account credentials not configured');
  }

  try {
    // Get access token using service account
    const accessToken = await generateAccessToken({
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });

    // Fetch data from Google Sheets API
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Sheets API error: ${error}`);
    }

    const data = await response.json();
    const rows: string[][] = data.values || [];

    // Skip header row (index 0) and parse the rest
    const events = rows
      .slice(1)
      .map(parseSheetRow)
      .filter((event): event is Event => event !== null)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return events;
  } catch (error) {
    console.error('Error fetching events from Google Sheets:', error);
    throw error;
  }
}

export function isFutureEvent(event: Event): boolean {
  return event.startDate.getTime() > Date.now();
}

export function isPastEvent(event: Event): boolean {
  return event.endDate.getTime() < Date.now();
}

function parseTaskRow(row: string[]): CrewTask | null {
  // Skip rows without required data (id and label)
  if (!row[0] || !row[1]) return null;

  try {
    return {
      id: row[0], // Id
      label: row[1], // Label
      description: row[2] || undefined, // Description (optional)
    };
  } catch (error) {
    console.error('Error parsing task row:', error);
    return null;
  }
}

export async function fetchTaskList(taskListName?: string): Promise<CrewTask[]> {
  if (!SHEET_ID) {
    throw new Error('EXPO_PUBLIC_GOOGLE_SHEET_ID is not configured');
  }

  const privateKey = process.env.EXPO_PUBLIC_GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Service account credentials not configured');
  }

  const sheetName = taskListName ? `Tasks ${taskListName}` : `Tasks ${DEFAULT_TASK_LIST}`;

  try {
    // Get access token using service account
    const accessToken = await generateAccessToken({
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });

    // Fetch data from Google Sheets API
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Sheets API error: ${error}`);
    }

    const data = await response.json();
    const rows: string[][] = data.values || [];

    // Skip header row (index 0) and parse the rest
    const tasks = rows
      .slice(1)
      .map(parseTaskRow)
      .filter((task): task is CrewTask => task !== null);

    // Always append the hardcoded "Absent" task as the last option
    tasks.push({
      id: 'absent',
      label: 'Absent',
      description: 'Not able to attend this event',
    });

    return tasks;
  } catch (error) {
    console.error(`Error fetching task list "${sheetName}" from Google Sheets:`, error);
    throw error;
  }
}
