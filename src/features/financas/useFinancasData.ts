import { useCallback, useEffect, useState } from 'react'
import { api } from '@/data/api'
import type { FixedBill, SpendingItem } from '@/data/types'

export interface FinancasData {
  spending: SpendingItem[]
  fixedBills: FixedBill[]
  monthlyBudget: number
}

const BUDGET_STORAGE_KEY = 'act.financas.monthlyBudget'

export function useFinancasData() {
  const [data, setData] = useState<FinancasData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [spending, fixedBills] = await Promise.all([
        api.list<SpendingItem>('spendingEntries').catch(async () => {
          return api.list<SpendingItem>('spending').catch(() => [])
        }),
        api.list<FixedBill>('fixedBills').catch(() => []),
      ])

      const savedBudget = Number(localStorage.getItem(BUDGET_STORAGE_KEY)) || 3500

      setData({
        spending: Array.isArray(spending) ? spending : [],
        fixedBills: Array.isArray(fixedBills) ? fixedBills : [],
        monthlyBudget: savedBudget,
      })
    } catch {
      setData({ spending: [], fixedBills: [], monthlyBudget: 3500 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addSpending = async (draft: Omit<SpendingItem, 'id' | 'createdAt'>) => {
    const created = await api.create<SpendingItem>('spendingEntries', draft)
    setData((prev) => (prev ? { ...prev, spending: [created, ...prev.spending] } : null))
    return created
  }

  const removeSpending = async (id: string) => {
    await api.remove<SpendingItem>('spendingEntries', id)
    setData((prev) =>
      prev ? { ...prev, spending: prev.spending.filter((s) => s.id !== id) } : null,
    )
  }

  const addFixedBill = async (draft: Omit<FixedBill, 'id' | 'paidMonths'>) => {
    const created = await api.create<FixedBill>('fixedBills', { ...draft, paidMonths: [] })
    setData((prev) => (prev ? { ...prev, fixedBills: [...prev.fixedBills, created] } : null))
    return created
  }

  const removeFixedBill = async (id: string) => {
    await api.remove<FixedBill>('fixedBills', id)
    setData((prev) =>
      prev ? { ...prev, fixedBills: prev.fixedBills.filter((b) => b.id !== id) } : null,
    )
  }

  const toggleBillPaid = async (billId: string, monthStr: string) => {
    if (!data) return
    const bill = data.fixedBills.find((b) => b.id === billId)
    if (!bill) return

    const currentMonths = bill.paidMonths || []
    const isPaid = currentMonths.includes(monthStr)
    const nextMonths = isPaid
      ? currentMonths.filter((m) => m !== monthStr)
      : [...currentMonths, monthStr]
    const updatedList = await api.update<FixedBill>('fixedBills', billId, { paidMonths: nextMonths })
    setData((prev) => (prev ? { ...prev, fixedBills: updatedList } : null))
  }

  const setMonthlyBudget = (budget: number) => {
    localStorage.setItem(BUDGET_STORAGE_KEY, String(budget))
    setData((prev) => (prev ? { ...prev, monthlyBudget: budget } : null))
  }

  return {
    data,
    loading,
    addSpending,
    removeSpending,
    addFixedBill,
    removeFixedBill,
    toggleBillPaid,
    setMonthlyBudget,
    reload: loadData,
  }
}
