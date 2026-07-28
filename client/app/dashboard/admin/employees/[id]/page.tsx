import { EmployeeKpiDetail } from "@/features/admin/components/employee-kpi-detail"

type RouteProps = { params: Promise<{ id: string }> }

export default async function AdminEmployeeKpiPage({ params }: RouteProps) {
  const { id } = await params
  return <EmployeeKpiDetail id={id} />
}
