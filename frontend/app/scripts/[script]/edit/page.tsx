import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList, BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {getScript, getScriptCode} from "@/apis";
import EditScriptForm from "@/app/scripts/[script]/edit/edit-script-form";

export default async function Page({params}: {params: Promise<{script: string}>}){

    const {script} = await params;

    const scriptInfo = await getScript(script);
    const scriptCode = await getScriptCode(script);

    return(
        <div style={{width:'100%',height:'100%', padding: '10px', boxSizing: 'border-box'}}>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/scripts">Scripts</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href={`/scripts/${script}`}>
                            <i>
                                {scriptInfo ? scriptInfo?.script.name : script}
                            </i>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <br></br>
            <div className={"flex justify-center"}>
                <EditScriptForm defaultValues={{...scriptInfo?.script, code: scriptCode}}/>
            </div>
        </div>
    )
}