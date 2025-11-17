/**
 * Utility functions for generating and parsing user profile slugs
 */

/**
 * Convert text to URL-safe slug
 * @param {string} text - Text to convert
 * @returns {string} URL-safe slug
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
}

/**
 * Generate user profile slug from name and ID
 * @param {string} name - User's name
 * @param {number} userId - User's ID
 * @returns {string} Complete slug (e.g., "john-doe-123")
 */
export function generateUserSlug(name, userId) {
  const nameSlug = slugify(name);
  return `${nameSlug}-${userId}`;
}

/**
 * Parse user slug to extract ID
 * @param {string} slug - Profile slug (e.g., "john-doe-123" or "123")
 * @returns {number|null} User ID or null if invalid
 */
export function parseUserSlug(slug) {
  // Check if it's a pure numeric ID
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }
  
  // Try to extract ID from slug (last part after final hyphen)
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];
  
  if (/^\d+$/.test(lastPart)) {
    return parseInt(lastPart, 10);
  }
  
  return null;
}
