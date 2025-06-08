"use client";
import {Script} from "@/interfaces";
import {ColumnDef} from "@tanstack/react-table"
import {useEffect, useState} from "react";
import {deleteScript, getScripts, runScript} from "@/apis";
import {DropdownMenuDemo} from "@/app/scripts/DropdownMenu";
import DataTable from "@/components/data-table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";
import {toast} from "sonner";



export function ScriptTable() {

    const router = useRouter();


    const [runModel, setRunModel] = useState<Script|null>(null);
    const [data, setData] = useState<Script[]>([])
    const [total, setTotal] = useState<number>(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 100
    })

    useEffect(() => {
        async function fetchData(){
            const scripts = await getScripts(pagination.pageIndex, pagination.pageSize);
            setData(scripts.scripts)
            setTotal(scripts.total)
        }
        void fetchData();
    }, [pagination]);

    const onRunScript = async (scriptId: string) => {
        try {
            await runScript(scriptId);
            router.push(`/scripts/${scriptId}`)
        }catch (e: unknown) {
            toast.error(e as string);
            return Promise.reject(e)
        }
    }

    const onDelete = async (scriptId: string) => {
        try {
            await deleteScript(scriptId);
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
            toast.success("Script deleted successfully.")
        } catch (e: unknown) {
            toast.error("Something went wrong!");
            return Promise.reject(e)
        }
    }

    const columns: ColumnDef<Script>[] = [
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "language",
            header: "Language",
        },
        {
            accessorKey: "image_name",
            header: "Image",
        },
        {
            accessorKey: "options",
            header: "Options",
            cell: ({row}) => <div>
                <DropdownMenuDemo script={row.original}
                                  onRun={() => {
                                        setRunModel(row.original)
                                    }}
                                  onDelete={(scriptId: string) => {
                                      onDelete(scriptId)
                                  }}
                />
            </div>,
            size: 60,
            minSize: 45,
            maxSize: 60
        }
    ]


    return (
        <>
            <DataTable data={data}
                       columns={columns}
                       pagination={pagination}
                       total={total}
                       onPaginate={setPagination}
            />

            {(runModel && (
                <Dialog open={true} onOpenChange={() => setRunModel(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Confirmation</DialogTitle>
                            <DialogDescription>
                                Please confirm you&apos;d like to run the script:
                            </DialogDescription>
                            <DialogDescription>
                                <i><strong>{runModel.name}</strong></i>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" className={"hover:cursor-pointer"} onClick={() => onRunScript(runModel?.id)}>Run script</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ))}
        </>

    )
}


