import SchedulesTable from "@/app/scripts/[script]/schedule/schedules-table";
import {getScript} from "@/apis";
import PageHeader from "@/app/scripts/[script]/schedule/page-header";

export default async function Page({params}: {params: Promise<{script: string}>}){
    const {script} = await params;

    const scriptInfo = await getScript(script);

    return (
        <div style={{width:'100%',height: 'calc(100vh - 28px)', padding: '10px', boxSizing: 'border-box', overflowY: "scroll"}}>
            <PageHeader scriptInfo={scriptInfo} />
            <br></br>
            <SchedulesTable scriptId={script} />
        </div>
    )
}