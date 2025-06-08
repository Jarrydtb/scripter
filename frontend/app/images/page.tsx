import Link from "next/link";
import {Plus} from "lucide-react";
import {ImageTable} from "@/app/images/image_table";

export default async function Page(){


    return (
        <div style={{width:'100%',height:'100%', padding: '10px', boxSizing: 'border-box'}}>
            <div className={"flex items-center justify-between px-1"}>
                <h1>Images</h1>
                <Link href={"/images/create"} className={"flex items-center justify-center bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"}>
                    <Plus size={16}/>
                    Create Image
                </Link>
            </div>
            <br></br>
            <ImageTable />
        </div>
    )
}