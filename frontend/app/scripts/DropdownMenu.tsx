import {
    Calendar, Delete, Edit, Eye, MoreHorizontal, Play
} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link";
import {Script} from "@/interfaces";

type DropDownProps = {
    script: Script;
    onRun: (scriptId: string) => void;
    onDelete: (scriptId: string) => void;
}

export function DropdownMenuDemo({script, onRun, onDelete}: DropDownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild >
                <button className="p-1 border rounded w-[30px] justify-center flex hover:bg-[#383838] hover:cursor-pointer"><MoreHorizontal size={16} /> </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side={"bottom"}>
                <DropdownMenuLabel><i>{script.name}</i></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem className={"hover:bg-[#383838]"}>
                    <div className="flex gap-2 items-center hover:cursor-pointer w-full" onClick={() => onRun(script.id)}>
                            <Play size={16}/>
                            Run Script
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"hover:bg-[#383838]"}>
                        <Link href={`/scripts/${script.id}`} className={"flex gap-2 items-center w-full"}>
                            <Eye />
                            View Jobs
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"hover:bg-[#383838]"}>
                        <Link href={`/scripts/${script.id}/schedule`} className={"flex gap-2 items-center w-full"}>
                            <Calendar size={16}/>
                            See Scheduled
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"hover:bg-[#383838]"}>
                        <Link href={`/scripts/${script.id}/edit`}
                              className="flex gap-2 items-center w-full"
                        >
                            <Edit size={16} />
                            Edit Script
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={"hover:bg-red-400/20"}>
                    <div className="flex gap-2 items-center text-red-400 hover:cursor-pointer w-full" onClick={() => onDelete(script.id)}>
                        <Delete size={16} className={"text-red-400"}/>
                        Delete
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
