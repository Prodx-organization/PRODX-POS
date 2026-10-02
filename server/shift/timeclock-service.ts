successfully downloaded text file (SHA: 891be988a6498b9723bbe6a41c2e383a74a47f01const resolvePinUser = async (tx: SqlQueryExecutor, context: Context, pin: string) => {
  if (!PIN_RE.test(pin)) throw new TimeclockValidationError('PIN must be exactly 4 digits.');

  const lookup = lookupHash(pin);
  const credentials = await tx.query<{
    user_id: string; pin_hash: string; failed_attempts: number; locked_until: string|Date|null;
    status: 'active'|'disabled'; display_name: string;
  }>(
    `SELECT c.user_id,c.pin_hash,c.failed_attempts,c.locked_until,u.status,u.display_name
       FROM prodx_timeclock_credentials c
       JOIN prodx_users u ON u.id=c.user_id AND u.organization_id=c.organization_id
      WHERE c.organization_id=$1 AND c.store_id=$2 AND c.pin_lookup_hash=$3
      FOR UPDATE OF c`,
    [context.organizationId, context.storeId, lookup],
  );
  const row = credentials.rows[0];
  if (row?.status === 'active') {
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
      await tx.query(
        `INSERT INTO prodx_audit_log(id,organization_id,store_id,user_id,action,severity,details)
         VALUES($1,$2,$3,$4,'timeclock_pin_verified','info',$5::jsonb)`,
        [crypto.randomUUID(), context.organizationId, context.storeId, context.userId, JSON.stringify({ employeeUserId: row.user_id })],
      );
      return row;
    }
  }

  const attempts = await tx.query<{failed_attempts:number;locked_until:string|Date|null}>(
    `SELECT failed_attempts,locked_until
       FROM prodx_timeclock_attempts
      WHERE organization_id=$1 AND store_id=$2 AND user_id=$3
      FOR UPDATE`,
    [context.organizationId, context.storeId, context.userId],
  );
  const current = attempts.rows[0]?.failed_attempts ?? 0;
  const next = current + 1;
  await tx.query(
    `INSERT INTO prodx_timeclock_attempts(organization_id,store_id,user_id,failed_attempts,locked_until,updated_at)
     VALUES($1,$2,$3,$4,CASE WHEN $4 >= $5 THEN CURRENT_TIMESTAMP + ($6 || ' minutes')::interval ELSE NULL END,CURRENT_TIMESTAMP)
     ON CONFLICT(organization_id,store_id,user_id)
     DO UPDATE SET failed_attempts=EXCLUDED.failed_attempts,locked_until=EXCLUDED.locked_until,updated_at=CURRENT_TIMESTAMP`,
    [context.organizationId, context.storeId, context.userId, next, MAX_ATTEMPTS, LOCK_MINUTES],
  );
  if (next >= MAX_ATTEMPTS) throw new TimeclockLockedError('Timeclock PIN attempts are temporarily locked.');
  throw new TimeclockAuthenticationError('Invalid timeclock PIN.');
};)