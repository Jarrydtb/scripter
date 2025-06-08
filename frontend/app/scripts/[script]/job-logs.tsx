import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {JobStatus} from "@/app/scripts/[script]/enums";
import {Button} from "@/components/ui/button";
import {X} from "lucide-react";
import {LoadingSpinner} from "@/components/loading-spinner";
import {getJobLogs} from "@/apis";
import {JobLog, Jobs} from "@/interfaces"
import {useEffect, useState} from "react";

export default function JobLogs({open, jobId, onClose}: {open: boolean, jobId?: number, onClose: () => void }) {

    const [loading, setLoading] = useState(true);
    const [logContent, setLogContent] = useState<string[] | null>(null);
    const [job, setJob] = useState<Jobs>(null!)

    const fetchLogContent = async (id: number, position: number = 0): Promise<JobLog> => {
        try {
            return Promise.resolve(await getJobLogs(id, position))
        } catch (e) {
            setLogContent(["Error fetching log content"]);
            setLoading(false)
            return Promise.reject(e);
        }
    }

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let nextPosition: number = 0;

        const pollLogs = async () => {
            if (!jobId) return;
            try {
                const {job: myJob, lines, new_position} = await fetchLogContent(jobId, nextPosition);
                setJob(myJob);
                if(myJob.status == JobStatus.RUNNING || myJob.status == JobStatus.PENDING){
                    setLogContent(prev => [...(prev ? prev : []), ...lines])
                    nextPosition = new_position;
                }else{
                    setLogContent(prev => [...(prev ? prev : []), ...lines])
                    nextPosition = new_position;
                    setLoading(false)
                    clearInterval(interval)
                }

            }catch (error){
                console.error(error)
                clearInterval(interval)
            }
        }

        // Initial fetch
        if (jobId) {
            void pollLogs();
            interval = setInterval(pollLogs, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [jobId]);

    return(
        <>
            {(open && !!job) && (
                <Drawer open={open}
                        onOpenChange={(open) => {
                            if(!open) {
                                setLoading(true)
                                setLogContent(null)
                                onClose();
                            }}}
                >
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>
                                <div className={"flex justify-between items-center"}>
                                    <div className={"flex items-center justify-center gap-2 shadow-sm"}>
                                        <p className={job.status == 2 ? "text-green-200" : job.status == 3 ? "text-red-200" : "text-orange-200"}>
                                            {JobStatus[job.status]}
                                        </p>
                                        (<i>{job.created_at ? new Date(Number(job.created_at * 1000)).toLocaleString() : null} - {job.finished_at ? new Date(Number(job.finished_at * 1000)).toLocaleString() : "..."}</i>)
                                    </div>
                                    <Button size={"icon"} variant={"outline"} className={"hover:cursor-pointer"} onClick={() => {
                                        setLogContent(null);
                                        setLoading(true);
                                        onClose();
                                    }}>
                                        <X size={8} />
                                    </Button>
                                </div>
                            </DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4">

                            {logContent && (
                                <div className="p-4 bg-black/50 border rounded" style={{maxHeight: "50vh", overflowY: "auto"}}>
                                    {logContent.map((item, i) => (
                                        <pre key={i}>{item}</pre>
                                    ))}
                                    {(loading && (
                                        <div className="flex items-center justify-center">
                                            <LoadingSpinner />
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                        <div className={"h-[20px]"} />
                    </DrawerContent>
                </Drawer>
            )}
        </>
    )
}