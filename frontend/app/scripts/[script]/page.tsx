import JobsTable from "@/app/scripts/[script]/jobs_table";


export default async function Page({params}: {params: Promise<{script: string}>}){

    const {script} = await params;

    return (
        <div style={{width:'100%',height:'100%', padding: '10px', boxSizing: 'border-box'}}>
            <JobsTable scriptId={script}/>
        </div>
    )
}