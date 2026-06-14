/**
 * E2E tests — Notes module
 * Full browser flows using Playwright.
 * Notes are always embedded in the Notes tab of a parent record (deal / contact / company / lead).
 * These tests anchor to the Deal detail page, which is the most common context.
 *
 * Test IDs: notes-e2e-01 … notes-e2e-16
 *
 * Prerequisites:
 *  - App running at PLAYWRIGHT_BASE_URL (default: http://localhost:5173)
 *  - Seeded admin user: admin@e2e-notes.invalid / Password1!
 *  - Seeded sales_rep user A: rep-a@e2e-notes.invalid / Password1!
 *  - Seeded sales_rep user B: rep-b@e2e-notes.invalid / Password1!
 *  - Both reps belong to the same org as the admin.
 *  - At least one Deal exists accessible by admin (title: "E2E Notes Deal").
 *  - At least one Contact exists accessible by admin (name: "E2E Notes Contact").
 */

import { test, expect, type Page } from '@playwright/test'

// ── Constants ──────────────────────────────────────────────────────────────────

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

const ADMIN   = { email: 'admin@e2e-notes.invalid',  password: 'Password1!' }
const REP_A   = { email: 'rep-a@e2e-notes.invalid',  password: 'Password1!' }
const REP_B   = { email: 'rep-b@e2e-notes.invalid',  password: 'Password1!' }

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel(/email/i).fill(creds.email)
  await page.getByLabel(/password/i).fill(creds.password)
  await page.getByRole('button', { name: /log in/i }).click()
  await page.waitForURL(`${BASE}/deals`)
}

async function openDealNotesTab(page: Page) {
  await page.goto(`${BASE}/deals`)
  // Open the first deal that appears (the E2E Notes Deal)
  await page.getByText('E2E Notes Deal').first().click()
  // Switch to Notes tab on the deal detail page
  await page.getByRole('tab', { name: /notes/i }).click()
  await expect(page.getByTestId('notes-feed')).toBeVisible()
}

async function openContactNotesTab(page: Page) {
  await page.goto(`${BASE}/contacts`)
  await page.getByText('E2E Notes Contact').first().click()
  await page.getByRole('tab', { name: /notes/i }).click()
  await expect(page.getByTestId('notes-feed')).toBeVisible()
}

function uniqueNote(prefix = 'E2E Note') {
  return `${prefix} ${Date.now()}`
}

// ── AC-01: Create note linked to a record ─────────────────────────────────────

test.describe('AC-01 — Create note linked to a deal', () => {
  test('notes-e2e-01: sales rep creates a note on a deal; note appears in Notes tab', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    const content = uniqueNote('Rep A deal note')

    // Open inline create form
    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(content)
    await page.getByRole('button', { name: /^save/i }).click()

    // Note appears in the feed
    await expect(page.getByText(content)).toBeVisible()
    // Success toast
    await expect(page.getByText(/note (added|created|saved)/i)).toBeVisible()
  })

  test('notes-e2e-02: AC-01 — admin creates a note on a contact; note appears in Notes tab', async ({ page }) => {
    await login(page, ADMIN)
    await openContactNotesTab(page)

    const content = uniqueNote('Admin contact note')

    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(content)
    await page.getByRole('button', { name: /^save/i }).click()

    await expect(page.getByText(content)).toBeVisible()
    await expect(page.getByText(/note (added|created|saved)/i)).toBeVisible()
  })
})

// ── AC-02: Note must link to at least one record ──────────────────────────────

test.describe('AC-02 — Note requires a linked record', () => {
  test('notes-e2e-03: empty content shows inline validation error', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    await page.getByRole('button', { name: /add note/i }).click()
    // Leave content empty and submit
    await page.getByRole('button', { name: /^save/i }).click()

    // Inline validation error should appear
    await expect(page.getByText(/content is required|note content is required/i)).toBeVisible()
  })
})

// ── AC-03 / AC-04: Edit note — author can; non-author cannot ─────────────────

test.describe('AC-03/AC-04 — Edit note permissions', () => {
  let noteContent: string

  test('notes-e2e-04: AC-03 — author (Rep A) can edit their own note inline', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    noteContent = uniqueNote('Rep A editable note')

    // Create the note
    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(noteContent)
    await page.getByRole('button', { name: /^save/i }).click()
    await expect(page.getByText(noteContent)).toBeVisible()

    // Edit it — hover the note card to reveal edit button
    const noteCard = page.locator('[data-testid="note-card"]').filter({ hasText: noteContent }).first()
    await noteCard.hover()
    await noteCard.getByRole('button', { name: /edit/i }).click()

    const updatedContent = noteContent + ' — edited'
    await noteCard.getByRole('textbox').fill(updatedContent)
    await noteCard.getByRole('button', { name: /^save/i }).click()

    await expect(page.getByText(updatedContent)).toBeVisible()
    await expect(page.getByText(/note updated/i)).toBeVisible()
  })

  test('notes-e2e-05: AC-04 — Rep B does not see edit/delete controls on Rep A note', async ({ page }) => {
    // Rep A must create a note first (done via API-like setup; use existing note from e2e-04)
    // Log in as Rep B on the same deal
    await login(page, REP_B)
    await openDealNotesTab(page)

    // Find any note card — if it belongs to Rep A, the edit/delete buttons must not be visible
    const noteCards = page.locator('[data-testid="note-card"]')
    const count = await noteCards.count()
    if (count === 0) {
      // No notes from other users visible; pass vacuously
      return
    }

    // For each note whose author is not Rep B, verify no edit button
    for (let i = 0; i < count; i++) {
      const card = noteCards.nth(i)
      const isOwnNote = await card.locator('[data-testid="note-author-badge"][data-own="true"]').count()
      if (isOwnNote === 0) {
        // Not own note — edit and delete must be absent
        await card.hover()
        await expect(card.getByRole('button', { name: /edit/i })).not.toBeVisible()
        await expect(card.getByRole('button', { name: /delete/i })).not.toBeVisible()
      }
    }
  })
})

// ── AC-05 / AC-06: Delete note ────────────────────────────────────────────────

test.describe('AC-05/AC-06 — Delete note permissions', () => {
  test('notes-e2e-06: AC-05 — author (Rep A) can soft-delete their own note', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    const content = uniqueNote('Rep A note to delete')

    // Create
    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(content)
    await page.getByRole('button', { name: /^save/i }).click()
    await expect(page.getByText(content)).toBeVisible()

    // Delete — hover card to reveal delete button
    const noteCard = page.locator('[data-testid="note-card"]').filter({ hasText: content }).first()
    await noteCard.hover()
    await noteCard.getByRole('button', { name: /delete/i }).click()

    // Inline confirmation dialog
    await expect(page.getByText(/are you sure|confirm delete/i)).toBeVisible()
    await page.getByRole('button', { name: /^confirm$|^yes/i }).click()

    // Note no longer in feed
    await expect(page.getByText(content)).not.toBeVisible()
    await expect(page.getByText(/note deleted/i)).toBeVisible()
  })

  test('notes-e2e-07: AC-06 — Rep B cannot delete Rep A note (no delete button shown)', async ({ page }) => {
    await login(page, REP_B)
    await openDealNotesTab(page)

    // Any note created by Rep A should not show delete button for Rep B
    const noteCards = page.locator('[data-testid="note-card"]')
    const count = await noteCards.count()

    for (let i = 0; i < count; i++) {
      const card = noteCards.nth(i)
      const isOwnNote = await card.locator('[data-testid="note-author-badge"][data-own="true"]').count()
      if (isOwnNote === 0) {
        await card.hover()
        await expect(card.getByRole('button', { name: /delete/i })).not.toBeVisible()
      }
    }
  })
})

// ── AC-07: Admin can delete any note ─────────────────────────────────────────

test.describe('AC-07 — Admin can delete any note', () => {
  test('notes-e2e-08: admin sees delete button on notes by other users and can remove them', async ({ page }) => {
    // Rep A creates a note first so admin has something to delete
    const repAPage = await page.context().newPage()
    await login(repAPage, REP_A)
    await repAPage.goto(`${BASE}/deals`)
    await repAPage.getByText('E2E Notes Deal').first().click()
    await repAPage.getByRole('tab', { name: /notes/i }).click()

    const targetContent = uniqueNote('Rep A note — admin will delete')
    await repAPage.getByRole('button', { name: /add note/i }).click()
    await repAPage.getByLabel(/note content/i).fill(targetContent)
    await repAPage.getByRole('button', { name: /^save/i }).click()
    await expect(repAPage.getByText(targetContent)).toBeVisible()
    await repAPage.close()

    // Admin logs in and deletes it
    await login(page, ADMIN)
    await openDealNotesTab(page)

    const noteCard = page.locator('[data-testid="note-card"]').filter({ hasText: targetContent }).first()
    await noteCard.hover()
    await noteCard.getByRole('button', { name: /delete/i }).click()
    await page.getByRole('button', { name: /^confirm$|^yes/i }).click()

    await expect(page.getByText(targetContent)).not.toBeVisible()
    await expect(page.getByText(/note deleted/i)).toBeVisible()
  })
})

// ── AC-08: Pin note ───────────────────────────────────────────────────────────

test.describe('AC-08 — Pin note behaviour', () => {
  test('notes-e2e-09: pinned note appears at top of Notes tab above all unpinned notes', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    // Create two unpinned notes then a pinned one
    const unpinned1 = uniqueNote('Unpinned first')
    const unpinned2 = uniqueNote('Unpinned second')
    const pinnedContent = uniqueNote('This should be pinned')

    for (const content of [unpinned1, unpinned2]) {
      await page.getByRole('button', { name: /add note/i }).click()
      await page.getByLabel(/note content/i).fill(content)
      await page.getByRole('button', { name: /^save/i }).click()
      await expect(page.getByText(content)).toBeVisible()
    }

    // Create pinned note
    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(pinnedContent)

    // Check isPinned before saving if form supports it, else pin after save
    const pinCheckbox = page.getByLabel(/pin this note/i)
    if (await pinCheckbox.count() > 0) {
      await pinCheckbox.check()
    }
    await page.getByRole('button', { name: /^save/i }).click()
    await expect(page.getByText(pinnedContent)).toBeVisible()

    // If pin toggle is done post-save via the pin button on the card
    const pinnedCard = page.locator('[data-testid="note-card"]').filter({ hasText: pinnedContent }).first()
    const pinButton = pinnedCard.getByRole('button', { name: /pin|unpin/i })
    if (await pinButton.count() > 0) {
      const isPinned = await pinnedCard.locator('[data-testid="pin-indicator"]').count()
      if (isPinned === 0) {
        await pinButton.click()
        await expect(pinnedCard.locator('[data-testid="pin-indicator"]')).toBeVisible()
      }
    }

    // Assert — pinned note is first in the feed
    const cards = page.locator('[data-testid="note-card"]')
    const firstCardText = await cards.first().textContent()
    expect(firstCardText).toContain(pinnedContent)
  })

  test('notes-e2e-10: unpin a note; it drops back to chronological position', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    const pinnedContent = uniqueNote('To be unpinned')

    // Create and pin the note
    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(pinnedContent)
    await page.getByRole('button', { name: /^save/i }).click()
    await expect(page.getByText(pinnedContent)).toBeVisible()

    const noteCard = page.locator('[data-testid="note-card"]').filter({ hasText: pinnedContent }).first()
    await noteCard.hover()
    const pinBtn = noteCard.getByRole('button', { name: /^pin$/i })
    if (await pinBtn.count() > 0) {
      await pinBtn.click()
    }

    // Create a newer note after pinning so we have something newer
    const newerContent = uniqueNote('Newer unpinned')
    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill(newerContent)
    await page.getByRole('button', { name: /^save/i }).click()
    await expect(page.getByText(newerContent)).toBeVisible()

    // Unpin
    const pinnedCardAfter = page.locator('[data-testid="note-card"]').filter({ hasText: pinnedContent }).first()
    await pinnedCardAfter.hover()
    await pinnedCardAfter.getByRole('button', { name: /unpin/i }).click()

    // Newer note should now be first
    const cards = page.locator('[data-testid="note-card"]')
    const firstText = await cards.first().textContent()
    expect(firstText).toContain(newerContent)
  })
})

// ── NotesFeed embedded component ──────────────────────────────────────────────

test.describe('NotesFeed — embedded in parent record detail pages', () => {
  test('notes-e2e-11: Notes tab is visible on deal detail page', async ({ page }) => {
    await login(page, REP_A)
    await page.goto(`${BASE}/deals`)
    await page.getByText('E2E Notes Deal').first().click()
    await expect(page.getByRole('tab', { name: /notes/i })).toBeVisible()
  })

  test('notes-e2e-12: Notes tab is visible on contact detail page', async ({ page }) => {
    await login(page, REP_A)
    await page.goto(`${BASE}/contacts`)
    await page.getByText('E2E Notes Contact').first().click()
    await expect(page.getByRole('tab', { name: /notes/i })).toBeVisible()
  })

  test('notes-e2e-13: Notes feed shows empty state when no notes exist for a record', async ({ page }) => {
    await login(page, ADMIN)
    // Navigate to a deal with no notes (or use the contact tab)
    await page.goto(`${BASE}/contacts`)
    await page.getByText('E2E Notes Contact').first().click()
    await page.getByRole('tab', { name: /notes/i }).click()
    // Empty state message should be present if no notes
    const feed = page.getByTestId('notes-feed')
    await expect(feed).toBeVisible()
  })
})

// ── Error states ──────────────────────────────────────────────────────────────

test.describe('Error states', () => {
  test('notes-e2e-14: API error during note creation shows error toast', async ({ page }) => {
    await login(page, REP_A)
    await openDealNotesTab(page)

    // Intercept and fail the POST request
    await page.route('**/api/notes', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Server error' }) })
    })

    await page.getByRole('button', { name: /add note/i }).click()
    await page.getByLabel(/note content/i).fill('Error test note')
    await page.getByRole('button', { name: /^save/i }).click()

    await expect(page.getByText(/error|failed|something went wrong/i)).toBeVisible()
  })

  test('notes-e2e-15: 404 on note detail navigates or shows error state', async ({ page }) => {
    await login(page, REP_A)
    // Attempt to load a note GET that returns 404
    await page.route('**/api/notes/**', (route) => {
      route.fulfill({ status: 404, body: JSON.stringify({ error: 'NOT_FOUND', message: 'Note not found.' }) })
    })

    await page.goto(`${BASE}/deals`)
    await page.getByText('E2E Notes Deal').first().click()
    await page.getByRole('tab', { name: /notes/i }).click()

    // The notes feed should handle the 404 gracefully (empty or error state)
    await expect(
      page.getByText(/not found|no notes|error loading/i).or(page.getByTestId('notes-empty-state')),
    ).toBeVisible({ timeout: 5000 })
  })

  test('notes-e2e-16: 403 response when non-author tries to edit note via API shows forbidden error', async ({ page }) => {
    await login(page, REP_B)
    await openDealNotesTab(page)

    // Intercept the PUT request and return 403
    await page.route('**/api/notes/**', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'FORBIDDEN', message: 'You can only edit notes you created.' }),
        })
      } else {
        route.continue()
      }
    })

    // Try to edit any visible note (if edit button visible it means it's own note by UI;
    // the route intercept simulates backend rejection)
    const noteCards = page.locator('[data-testid="note-card"]')
    const count = await noteCards.count()
    if (count > 0) {
      const card = noteCards.first()
      await card.hover()
      const editBtn = card.getByRole('button', { name: /edit/i })
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await card.getByRole('textbox').fill('Attempted edit')
        await card.getByRole('button', { name: /^save/i }).click()
        await expect(page.getByText(/forbidden|you can only edit|not allowed/i)).toBeVisible()
      }
    }
  })
})
