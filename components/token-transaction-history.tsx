"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
  balance_before?: number
  balance_after?: number
}

interface TokenTransactionHistoryProps {
  userId: string
  limit?: number
}

export function TokenTransactionHistory({ userId, limit = 20 }: TokenTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true)
      try {
        const response = await fetch(`/api/token-transactions?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setTransactions(data.transactions || [])
            setTotalPages(Math.ceil(data.total / limit) || 1)
          }
        }
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [userId, page, limit])

  function getTypeColor(type: string) {
    switch (type) {
      case "recharge":
      case "purchase":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      case "bonus":
      case "subscription_bonus":
      case "subscription_grant":
        return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
      case "usage":
      case "chat_consumption":
      case "voice_call_consumption":
      case "image_generation":
      case "video_generation":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
      case "refund":
      case "refund_reversal":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      case "manual_adjustment":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
    }
  }

  function formatTypeName(type: string) {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Transaction History</CardTitle>
        <CardDescription>View your detailed token usage and purchase history</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1111FF]"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No token transactions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(transaction.type)} variant="outline">
                          {formatTypeName(transaction.type)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${transaction.amount > 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.balance_after !== undefined ? transaction.balance_after : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        onClick={() => setPage(p)}
                        isActive={page === p}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
