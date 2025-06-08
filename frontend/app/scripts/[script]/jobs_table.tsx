"use client";

import {ColumnDef} from "@tanstack/react-table";
import {useEffect, useMemo, useState} from "react";
import {cancelJob, deleteJob, getScriptJobs} from "@/apis";
import {Jobs} from "@/interfaces"
import {JobStatus} from "@/app/scripts/[script]/enums";
import {Ban, Delete, Logs} from "lucide-react";
import DataTable from "@/components/data-table";
import JobLogs from "@/app/scripts/[script]/job-logs";
import PageHeader from "@/app/scripts/[script]/page-header";


export default function JobsTable({scriptId}: {scriptId: string}) {


    const [showLogs, setShowLogs] = useState<Jobs|null>(null!);
    const [data, setData] = useState<Jobs[]>([])
    const [total, setTotal] = useState<number>(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    })


    const onDeleteJob = async (id: number) => {
        try {
            await deleteJob(id)
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
        }catch (error) {
            console.error(error)
        }
    }

    const onCancelJob = async (id: number) => {
        try {
            await cancelJob(id)
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
        }catch (error) {
            console.error(error)
        }
    }


    useEffect(() => {
        let interval: NodeJS.Timeout;

        async function fetchData(){
            const jobs = await getScriptJobs(scriptId, pagination.pageIndex, pagination.pageSize);
            setData(jobs.history)
            setTotal(jobs.total)
        }

        // Initial fetch
        if (scriptId) {
            void fetchData();
            interval = setInterval(fetchData, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [pagination]);

    const columns: ColumnDef<Jobs>[] = useMemo(() => [
        {
            accessorKey: "created_at",
            header: "Start",
            cell: ({row}) => row.original.created_at ? new Date(Number(row.original.created_at * 1000)).toLocaleString() : null,
        },
        {
            accessorKey: "finished_at",
            header: "Finish",
            cell: ({row}) => row.original.finished_at ? new Date(Number(row.original.finished_at * 1000)).toLocaleString() : <i>Unfinished</i>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({row}) => <div className={
                row.original.status == 2 ? "text-green-200" : row.original.status == 3 || row.original.status == 4 ? "text-red-200" : "text-orange-200"
            }>{JobStatus[row.original.status]}</div>,
        },
        {
            accessorKey: "options",
            header: "Options",
            cell: ({row}) => (
                <div className="flex items-center w-10">
                    <button onClick={async () => {
                        setShowLogs(row.original)
                    }} className="px-2 py-1 hover:bg-white/10 rounded hover:cursor-pointer">
                        <Logs size={16} />
                    </button>


                    {(row.original.status == JobStatus.PENDING || row.original.status == JobStatus.RUNNING ? (
                        <button onClick={() => onCancelJob(row.original.id)} className="px-2 py-1 hover:bg-white/10 rounded hover:cursor-pointer">
                            <Ban size={16} />
                        </button>
                            )
                            :
                        (
                        <button onClick={() => onDeleteJob(row.original.id)} className="px-2 py-1 hover:bg-white/10 rounded text-red-200 hover:cursor-pointer">
                            <Delete size={16} />
                        </button>
                        )
                    )}
                </div>
            ),
            size: 10
        }
    ], [])

    return (
        <>
            <PageHeader scriptId={scriptId} onRefresh={() => setPagination(prevState => ({...prevState, pageIndex: 0}))} />
            <br></br>
            <DataTable data={data} columns={columns} total={total} pagination={pagination} onPaginate={setPagination} />
            <JobLogs open={!!showLogs}
                     jobId={showLogs?.id}
                     onClose={() => {
                        setShowLogs(null)
                    }}
            />


        </>
    )
}