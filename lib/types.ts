export interface Event {
  eventId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  venueName: string;
  coverFee?: string;
  description?: string;
  streetAddress?: string;
  facebookUrl?: string;
  ticketsUrl?: string;
  ticketsTitle?: string;
  ageLimit?: string;
  hideFromHero?: boolean;
  payingGuests?: number;
  nonPayingGuests?: number;
  taskListName?: string;
}

export interface SheetRow {
  EventStartDateAndTime: string;
  EventEndDateAndTime: string;
  VenueName: string;
  OptionalCoverFee: string;
  OptionalEventTitle: string;
  OptionalEventDescription: string;
  OptionaCallToActionTitle: string;
  OptionalCallToActionUrl: string;
  OptionalVenueStreetAddress: string;
  OptionalFacebookEventUrl: string;
  OptionalAgeLimit: string;
  OptionalHideFromHero: string;
  OptionalPayingGuests: string;
  OptionalNonPayingGuests: string;
  OptionalTaskListName: string;
  EventId: string;
}

export interface CrewTask {
  id: string;
  label: string;
  description?: string;
}
