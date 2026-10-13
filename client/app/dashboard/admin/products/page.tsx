"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Package, Plus } from "lucide-react"

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/dashboard/data-table"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { ProductEditorDialog, type AdminProduct, type ProductCategory } from "@/components/dashboard/product-editor"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { adminProductsSteps } from "@/lib/tours/admin-products-tour"
import { formatMoney } from "@/lib/stores/franchise-store"

export default function AdminProductsPage() {
  const qc = useQueryClient()
  // null = closed, "create" = new product, otherwise the product being edited.
  const [editing, setEditing] = useState<"create" | AdminProduct | null>(null)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => api.get<{ data: AdminProduct[] }>("/admin/products").then((response) => response.data),
  })
  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["admin-product-categories"],
    queryFn: () =>
      api.get<ProductCategory[]>("/admin/product_categories").then((response) => response.data),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  })

  const products = productsData?.data ?? []
  const activeCount = products.filter((product) => product.active).length
  const lowStockCount = products.filter((product) => product.stock_quantity <= 5).length

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-products-header">
        <DashboardHeader
          actions={
            <Button
              data-tour="admin-products-add"
              onClick={() => setEditing("create")}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Product
            </Button>
          }
          title="Products"
          subtitle="Manage shop products, stock levels, and catalog status."
        />
      </div>

      {editing ? (
        <ProductEditorDialog
          categories={categories}
          onClose={() => setEditing(null)}
          product={editing === "create" ? null : editing}
        />
      ) : null}

      <DashboardPanel
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-tour="admin-products-stats"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Catalog</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Product Library</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#5f6268]">
          <span>{products.length} total</span>
          <span className="text-black/25">/</span>
          <span>{activeCount} active</span>
          <span className="text-black/25">/</span>
          <span>{lowStockCount} low stock</span>
        </div>
      </DashboardPanel>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading products...</p>
        </DashboardPanel>
      ) : products.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => setEditing("create")}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Product
            </Button>
          }
          icon={Package}
          title="No products yet"
          description="Create the first product for the shop catalog."
        />
      ) : (
        <div data-tour="admin-products-list">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Category</DataTableHeaderCell>
                <DataTableHeaderCell>Price</DataTableHeaderCell>
                <DataTableHeaderCell>Stock</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {products.map((product) => (
                <DataTableRow key={product.id}>
                  <DataTableCell className="font-bold text-[#101217]">{product.name}</DataTableCell>
                  <DataTableCell>{product.product_category?.name}</DataTableCell>
                  <DataTableCell className="font-semibold text-[#101217]">{formatMoney(product.price)}</DataTableCell>
                  <DataTableCell>{product.stock_quantity}</DataTableCell>
                  <DataTableCell>
                    <StatusBadgeFor status={product.active ? "active" : "inactive"} />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => setEditing(product)} size="xs" variant="outline">
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={deleteMutation.isPending}
                            size="xs"
                            variant="destructive"
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove &quot;{product.name}&quot; from the shop catalog. Customers
                              will no longer be able to buy it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(product.id)}
                            >
                              Delete product
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      <TutorialButton steps={adminProductsSteps} pageKey="admin-products" />
    </DashboardPage>
  )
}

