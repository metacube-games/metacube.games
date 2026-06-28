/**
 * Application-wide constants
 */

/**
 * Maximum render distance for the camera in 3D space
 * Used to optimize performance by culling distant objects
 */
export const CAMERA_FAR_VIEW = 3000;

/**
 * Resolution modifier applied when the menu is displayed
 * Reduces GPU load during menu interaction (85% of full resolution)
 */
export const PAUSE_RESOLUTION_MODIFIER = 0.85;

/**
 * Origin of the Metacube marketplace.
 * Used as a link target for locked skins and as the base for
 * marketplace inventory/home URLs and collection image assets.
 */
export const METACUBE_MARKET_URL = "https://market.metacube.games";
