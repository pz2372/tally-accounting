import { Prisma } from '@prisma/client';
import prisma from '../config/database';

interface AuditEntry {
  orgId: string;
  userId?: string | null;  // null for system actions
  action: string;          // CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
  entityType: string;      // Expense, SalesReport, etc.
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown> | null;
}

// Write a single audit log entry. Fire-and-forget — never blocks the caller.
export function audit(entry: AuditEntry): void {
  prisma.auditLog.create({
    data: {
      orgId: entry.orgId,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: (entry.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  }).catch(err => {
    console.error('[audit] Failed to write audit log:', err);
  });
}

// Diff two objects and return only the fields that changed.
// Returns null if nothing changed.
export function diff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields: string[]
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = oldObj[field] ?? null;
    const newVal = newObj[field] ?? null;

    // Compare dates by ISO string
    const oldCmp = oldVal instanceof Date ? oldVal.toISOString() : oldVal;
    const newCmp = newVal instanceof Date ? newVal.toISOString() : newVal;

    if (JSON.stringify(oldCmp) !== JSON.stringify(newCmp)) {
      changes[field] = { old: oldCmp, new: newCmp };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
