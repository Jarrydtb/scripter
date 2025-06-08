import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import CreateScriptForm from "@/app/scripts/create/create-script-form";

export default function Page(){

    return (
        <div style={{width:'100%',height:'100%', padding: '10px', boxSizing: 'border-box'}}>
            <div className={"flex items-center justify-between w-full pl-4 pr-4"}>
                <Link href={"/scripts"} className={"flex items-center justify-center bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 rounded h-8 gap-1.5 px-3 has-[>svg]:px-2.5"}>
                    <ArrowLeft size={20}/>
                    Back
                </Link>
            </div>
            <div className={"flex justify-center w-full min-h-2/3 p-4"}>
                <div className={"flex justify-center rounded-md min-w-full"}>
                    <CreateScriptForm />
                </div>
            </div>

        </div>
    )
}