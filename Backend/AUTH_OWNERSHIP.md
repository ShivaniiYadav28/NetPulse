# Authentication and existing data ownership

New user registrations create accounts but do not claim existing NetPulse records.
New monitors, alert rules, incidents, monitoring history, and alerts carry an
`ownerId`. User-facing device, incident, analytics, and alert APIs always filter
by the authenticated session's user ID.

Existing documents without `ownerId` remain unchanged. They are excluded from
user-facing APIs, including analytics, but the scheduled monitoring worker
continues to monitor existing devices as a system operation. Starter devices
created by the bootstrap service are likewise ownerless until an explicit,
audited migration is designed.

There is no automatic ownership migration. Before making legacy records visible
to an account, an operator must establish ownership from a trusted source and
run a reviewed, backed-up migration scoped to those records. This avoids
assigning shared historical data to whichever account registers first.
