// Shared by the REST route (routes/expenses.js) and Hermie's mark_bill_paid
// tool (routes/hermie.js) so both ways of marking a bill paid behave
// identically and can never drift apart.
//
// Marking a bill paid optionally deducts its amount from a chosen bank
// account, and marking it unpaid again credits that same amount back to
// whichever account it came from \u2014 so "safe to spend" numbers stay honest
// without the user having to separately go update their bank balance every
// time they pay something. Each pair of writes runs in a transaction so the
// bill and the account balance can't end up out of sync with each other.

export async function markBillPaid(pool, userId, expenseId, accountId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expRes = await client.query(
      "SELECT id, name, amount FROM expenses WHERE id = $1 AND user_id = $2",
      [expenseId, userId]
    );
    if (!expRes.rows.length) {
      await client.query("ROLLBACK");
      return { error: "Bill not found." };
    }
    const exp = expRes.rows[0];

    if (accountId) {
      const acctRes = await client.query(
        "SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2",
        [accountId, userId]
      );
      if (!acctRes.rows.length) {
        await client.query("ROLLBACK");
        return { error: "That account wasn't found." };
      }
      await client.query(
        "UPDATE bank_accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3",
        [Number(exp.amount) || 0, accountId, userId]
      );
    }

    const updated = await client.query(
      "UPDATE expenses SET paid_at = now(), paid_from_account_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [accountId || null, expenseId, userId]
    );
    await client.query("COMMIT");
    return { row: updated.rows[0] };
  } catch (e) {
    await client.query("ROLLBACK");
    return { error: "Couldn't mark that bill paid: " + e.message };
  } finally {
    client.release();
  }
}

export async function markBillUnpaid(pool, userId, expenseId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expRes = await client.query(
      "SELECT id, name, amount, paid_from_account_id FROM expenses WHERE id = $1 AND user_id = $2",
      [expenseId, userId]
    );
    if (!expRes.rows.length) {
      await client.query("ROLLBACK");
      return { error: "Bill not found." };
    }
    const exp = expRes.rows[0];

    if (exp.paid_from_account_id) {
      await client.query(
        "UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3",
        [Number(exp.amount) || 0, exp.paid_from_account_id, userId]
      );
    }

    const updated = await client.query(
      "UPDATE expenses SET paid_at = NULL, paid_from_account_id = NULL WHERE id = $1 AND user_id = $2 RETURNING *",
      [expenseId, userId]
    );
    await client.query("COMMIT");
    return { row: updated.rows[0] };
  } catch (e) {
    await client.query("ROLLBACK");
    return { error: "Couldn't undo that: " + e.message };
  } finally {
    client.release();
  }
}
