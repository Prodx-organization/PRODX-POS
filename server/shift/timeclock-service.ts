successfully downloaded text file (SHA: 3dcd08e564cf90035ea4a9645026f24793d51b2bconst resolvePinUser = async (tx: SqlQueryExecutor, context: Context, pin: string) => {
  if (!PIN_RE.test(pin)) throw new TimeclockValidationError('PIN must be exactly 4 digits.');

  const credentials = await tx.query<{
    user_id: string; pin_hash: string; failed_attempts: number; locked_until: string|Date|null;
    status: 'active'|'disabled'; display_name: string;
  }>(
    `SELECT c.user_id,c.pin_hash,c.failed_attempts,c.locked_until,u.status,u.display_name
       FROM prodx_timeclock_credentials c
       JOIN prodx_users u ON u.id=c.user_id AND u.organization_id=c.organization_id
      WHERE c.organization_id=$1 AND c.store_id=$2 AND c.pin_lookup_hash=$3
      FOR UPDATE OF c`,
    [context.organizationId, context.storeId, lookupHash(pin)],
  );
  const row = credentials.rows[0];
  if (!row || row.status !== 'active') throw new TimeclockAuthenticationError('Invalid timeclock PIN.');
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    throw new TimeclockLockedError('Timeclock PIN is locked temporarily.');
  }
  if (await verifyPassword(pin, row.pin_hash)) {
    await tx.query(
      `UPDATE prodx_timeclock_credentials
          SET failed_attempts=0,last_authenticated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
        WHERE organization_id=$1 AND store_id=$2 AND user_id=$3`,
      [context.organizationId, context.storeId, row.user_id],
    );
    return row;
  }
  const next = row.failed_attempts + 1;
  await tx.query(
    `UPDATE prodx_timeclock_credentials
        SET failed_attempts=$4,
            locked_until=CASE WHEN $4 >= $5 THEN CURRENT_TIMESTAMP + ($6 || ' minutes')::interval ELSE locked_until END,
            updated_at=CURRENT_TIMESTAMP
      WHERE organization_id=$1 AND store_id=$2 AND user_id=$3`,
    [context.organizationId, context.storeId, row.user_id, next, MAX_ATTEMPTS, LOCK_MINUTES],
  );
  if (next >= MAX_ATTEMPTS) throw new TimeclockLockedError('Timeclock PIN is locked temporarily.');
  throw new TimeclockAuthenticationError('Invalid timeclock PIN.');
};)