/** Every chat limit lives here — never inlined in a component or a rule check. */
export const MAX_MESSAGE_LENGTH = 1000

/**
 * The realtime listener and each history page both use this. Keeping it small
 * is the main Firestore cost control: no listener ever spans a whole history.
 */
export const MESSAGE_PAGE_SIZE = 20

/** The character counter stays hidden until a message is nearly too long. */
export const MESSAGE_COUNTER_THRESHOLD = 900

/** Distance from the bottom that still counts as "reading the newest". */
export const SCROLL_BOTTOM_THRESHOLD_PX = 120
