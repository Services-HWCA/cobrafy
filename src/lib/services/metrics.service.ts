import { listClients } from "@/lib/services/client.service";
import { listClientDebts, localTodayString, calculateDebtStatus } from "@/lib/services/debt.service";
import type { Client, Debt } from "@/types";

export interface DebtMetrics {
  overdueDebts: number;
  overdueBalance: number;
  totalAccruedInterest: number;
  upcomingDueDebts: number;
  overdueClients: number;
}

export async function calculateDebtMetrics(uid: string): Promise<DebtMetrics> {
  const clients = await listClients(uid);
  const today = localTodayString();
  let overdueDebts = 0;
  let overdueBalance = 0;
  let totalAccruedInterest = 0;
  let upcomingDueDebts = 0;
  const overdueClientIds = new Set<string>();

  for (const client of clients) {
    const debts = await listClientDebts(uid, client);
    let clientHasOverdue = false;

    for (const debt of debts) {
      if (debt.accruedInterest > 0) {
        totalAccruedInterest += debt.accruedInterest;
      }

      const status = calculateDebtStatus(debt, today);
      if (status === "overdue" && debt.outstandingBalance > 0) {
        overdueDebts++;
        overdueBalance += debt.outstandingBalance;
        clientHasOverdue = true;
      } else if (status === "dueSoon" && debt.outstandingBalance > 0) {
        upcomingDueDebts++;
      }
    }

    if (clientHasOverdue) {
      overdueClientIds.add(client.id);
    }
  }

  return {
    overdueDebts,
    overdueBalance,
    totalAccruedInterest,
    upcomingDueDebts,
    overdueClients: overdueClientIds.size,
  };
}
