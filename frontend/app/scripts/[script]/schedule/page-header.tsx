"use client";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList, BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {Script} from "@/interfaces";
import {useState} from "react";
import CreateScheduleDrawer from "@/app/scripts/[script]/schedule/create-schedule-drawer";
import {useRouter} from "next/navigation";
export default function PageHeader({scriptInfo}: {scriptInfo: { script: Script }}) {

    const router = useRouter();
    const [create, setCreate] = useState(false);

    return(
        <>
            <div className={"flex justify-between items-center"}>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/scripts">Scripts</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href={`/scripts/${scriptInfo.script.id}`}>
                                <i>
                                    {scriptInfo && scriptInfo!.script.name}
                                </i>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Schedule</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Button onClick={()=> {
                    setCreate(true)
                }}>
                    <Plus /> Create
                </Button>
            </div>

            {(create && !!scriptInfo!.script!.id) && (
                <CreateScheduleDrawer open={create}
                                      onClose={() => setCreate(false)}
                                      scriptId={scriptInfo.script.id}
                                      onRefresh={function (): void {
                                          router.refresh()
                                      }} />
            )}
        </>
    )
}