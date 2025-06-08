"use client";

import {ColumnDef} from "@tanstack/react-table";
import {useEffect, useMemo, useState} from "react";
import DataTable from "@/components/data-table";
import {Scheduled} from "@/interfaces";
import {deleteSchedule, getScheduled, updateSchedule} from "@/apis";
import ScheduledDropdown from "@/app/scripts/[script]/schedule/scheduled-dropdown";
import ScheduleDrawer from "@/app/scripts/[script]/schedule/schedule-drawer";
import {toast} from "sonner";


export default function SchedulesTable({scriptId}: {scriptId: string}) {
    
    const [editSchedule, setEditSchedule] = useState<Scheduled|null>(null!);
    const [data, setData] = useState<Scheduled[]>([])
    const [total, setTotal] = useState<number>(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    })

    useEffect(() => {
        async function fetchData(){
            const scheduled = await getScheduled(scriptId, pagination.pageIndex, pagination.pageSize);
            setData(scheduled.schedules)
            setTotal(scheduled.total)
        }
        void fetchData();
    }, [pagination]);

    const onToggle = async (scheduleId: number, state: boolean) => {
        try {
            await updateSchedule(scheduleId, {"enabled": state});
            toast.success("Schedule updated successfully.");
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}));
        }catch (e) {
            console.error(e);
        }
    }

    const onDelete = async (scheduleId: number) => {
        try {
            await deleteSchedule(scheduleId);
            toast.success("Schedule deleted successfully.");
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}));
        }catch (e) {
            console.error(e);
        }
    }


    const columns: ColumnDef<Scheduled>[] = useMemo(() => [
        {
            accessorKey: "cron",
            header: "Cron",
            cell: ({row}) => row.original.cron ?? null
        },
        {
            accessorKey: "created_at",
            header: "Created at",
            cell: ({row}) => row.original.created_at ? new Date(Number(row.original.created_at * 1000)).toLocaleString() : "-"
        },
        {
            accessorKey: "last_run",
            header: "Last run",
            cell: ({row}) => row.original.last_run ? new Date(Number(row.original.last_run * 1000)).toLocaleString() : "-"
        },
        {
            accessorKey: "running",
            header: "Running",
            cell: ({row}) => row.original.running ? "True" : "False",
        },
        {
            accessorKey: "enabled",
            header: "Enabled",
            cell: ({row}) => row.original.enabled ? "True" : "False",
        },
        {
            id: "actions",
            header: "",
            cell: ({row}) => <div>
                <ScheduledDropdown
                    schedule={row.original}
                    onEdit={() => setEditSchedule(row.original)}
                    onToggle={(scheduleId, state) => onToggle(scheduleId, state)}
                    onDelete={(scheduledId: number) => onDelete(scheduledId)}
                />
            </div>,
            size: 60,
            minSize: 45,
            maxSize: 60
        }
    ], [])

    return (
        <>
            <DataTable data={data} columns={columns} total={total} pagination={pagination} onPaginate={setPagination} />

            { !!editSchedule && (
                <ScheduleDrawer open={!!editSchedule}
                                schedule={editSchedule!}
                                onClose={() => setEditSchedule(null!)}
                                onRefresh={() => {
                                    setEditSchedule(null!);
                                    setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
                                }}
                />
            )}

        </>
    )
}