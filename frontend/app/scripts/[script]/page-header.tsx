import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList, BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {Button} from "@/components/ui/button";
import {Calendar, Edit, Play} from "lucide-react";
import {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {runScript} from "@/apis";
import {toast} from "sonner";
import {useRouter} from "next/navigation";

export default function PageHeader({scriptId, onRefresh}: {scriptId: string, onRefresh: () => void}) {

    const router = useRouter();
    const [runModel, setRunModel] = useState<boolean>(false);

    const onRunScript = async () => {
        try {
            await runScript(scriptId);
            setRunModel(false);
            onRefresh();
        }catch (e: unknown) {
            toast.error(e as string);
            return Promise.reject(e)
        }
    }

    return (
        <>
            <div className={"flex justify-between items-center"}>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/scripts">Scripts</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Jobs</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className={"flex justify-between items-center gap-2"}>
                    <Button size={"sm"} className={"hover:cursor-pointer"} onClick={() => {
                        router.push(`/scripts/${scriptId}/schedule`);
                    }}>
                        <Calendar /> Schedules
                    </Button>
                    <Button size={"sm"} className={"hover:cursor-pointer"} onClick={() => {
                        router.push(`/scripts/${scriptId}/edit`);
                    }}>
                        <Edit /> Edit
                    </Button>
                    <Button size={"sm"} className={"hover:cursor-pointer"} onClick={() => {
                        setRunModel(true)
                    }}>
                        <Play /> Run
                    </Button>
                </div>
            </div>
            {(runModel && (
                <Dialog open={true} onOpenChange={() => setRunModel(false)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Confirmation</DialogTitle>
                            <DialogDescription>
                                Please confirm you&apos;d like to run this script
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" className={"hover:cursor-pointer"} onClick={() => onRunScript()}>Run script</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ))}
        </>

    )
}