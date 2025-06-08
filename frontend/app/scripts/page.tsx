import {ScriptTable} from "@/app/scripts/script_table";
import {Plus} from "lucide-react";
import Link from "next/link";


export default async function Scripts(){


    return(
        <div style={{width:'100%',height:'100%', padding: '10px', boxSizing: 'border-box'}}>
            <div className={"flex items-center justify-between px-1"}>
                <h1>Scripts</h1>
                <Link href={"/scripts/create"} className={"flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 rounded h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"}>
                    <Plus size={16}/>
                    Create Script
                </Link>
            </div>
            <br></br>
            <ScriptTable/>
        </div>
    )
}