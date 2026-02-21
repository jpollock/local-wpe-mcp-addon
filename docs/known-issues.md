# Known Issues

Tracked findings from code review that were intentionally deferred. Each entry includes the rationale for deferral.

## Inconsistent Error Shapes Across Composite Tools

**Finding:** Composite tools return errors in different shapes. Some return `{ error: string }`, others return partial results with an `errors` array, and others throw.

**Rationale:** This is a design choice, not a bug. Composite tools that fan out across multiple installs return partial results with per-install errors (so one failing install doesn't block the rest). Single-target composites throw on failure. Standardizing would require either losing partial results or adding complexity.

**Impact:** Low. AI agents handle both error shapes. The summarization layer normalizes output for the common case.

## No UUID Validation on Generated Tool Path Parameters

**Finding:** Generated tools accept path parameters (e.g., `install_id`, `account_id`) as strings without validating that they are valid UUIDs. An invalid ID produces a CAPI 404 rather than a local validation error.

**Rationale:** Codegen simplicity. Adding UUID validation to codegen would require knowing which parameters are UUIDs (not all string path params are). The CAPI's 404 response is clear enough, and the error formatting in `capi-client.ts` produces readable messages.

**Impact:** Low. Slightly worse error messages for invalid IDs. Could be addressed in codegen if it becomes a user complaint.

## server.ts Handles Multiple Concerns

**Finding:** `server.ts` contains tool listing, tool calling (with confirmation flow), resource handling, and prompt handling in a single 494-line file.

**Rationale:** The file is under 500 lines and the concerns are closely related (they all register MCP handlers on the same server instance). Splitting would add files and indirection without improving clarity. Worth revisiting if the file grows significantly.

**Impact:** Low. The file is readable and well-structured with clear sections.

## Sequential Pagination in getAll()

**Finding:** `capi-client.ts` `getAll()` follows pagination links sequentially. For endpoints with many pages, this could be parallelized using the total count and offset-based queries.

**Rationale:** Sequential pagination is simpler and avoids rate limiting issues. The CAPI uses cursor-based pagination (`next` links), and parallel offset queries aren't guaranteed to be consistent with cursor-based results. Most endpoints return under 5 pages.

**Impact:** Low. Portfolio tools (which make the most paginated calls) already handle concurrency at the account level. Individual pagination within an account is rarely more than 2-3 pages.

## INSTRUCTIONS String References Tool Names Without Compile-Time Checking

**Finding:** The `INSTRUCTIONS` string in `src/content/index.ts` references tool names like `wpe_portfolio_overview` as plain text. If a tool is renamed or removed, the INSTRUCTIONS won't produce a compile error.

**Rationale:** The INSTRUCTIONS string is natural language guidance, not executable code. Adding compile-time tool name validation would require a build step that extracts tool names and validates references — more complexity than the risk warrants. Drift detection (`npm run drift-check`) and the test suite catch most inconsistencies.

**Impact:** Medium. A renamed tool could leave stale references in INSTRUCTIONS. Mitigated by tests that verify tools exist and by the deliberate naming convention (`wpe_` prefix).

## No Rate Limit Coordination Across Concurrent Fan-Out

**Finding:** Portfolio and account-level composite tools fan out across multiple resources concurrently. Each individual request handles 429 retries independently, but there's no global rate limit coordinator to throttle concurrent requests when the CAPI starts returning 429s.

**Rationale:** In practice, the CAPI rate limits are generous enough that fan-out across a typical number of accounts (under 10) doesn't trigger sustained rate limiting. The per-request retry with exponential backoff handles transient 429s. A global coordinator would add complexity for a problem that rarely occurs.

**Impact:** Low for typical usage. Could become an issue for users with many accounts (20+) running portfolio tools frequently.
