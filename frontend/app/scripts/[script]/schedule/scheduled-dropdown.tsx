import {Scheduled} from "@/interfaces";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Delete, Edit, MoreHorizontal, ToggleLeft} from "lucide-react";

type Props = {
    schedule: Scheduled;
    onDelete: (scheduleId: number) => void;
    onToggle: (scheduleId: number, state: boolean) => void;
    onEdit: (scheduleId: number) => void;
}

export default function ScheduledDropdown({schedule, onDelete, onToggle, onEdit}: Props) {

    return(
        <DropdownMenu>
            <DropdownMenuTrigger asChild >
                <button className="p-1 border rounded w-[30px] justify-center flex hover:bg-[#383838]"><MoreHorizontal size={16} /> </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side={"bottom"}>
                <DropdownMenuLabel><i>{schedule.cron}</i></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem className={"hover:bg-[#383838]"}>
                        <div className={"flex gap-2 items-center w-full hover:cursor-pointer"} onClick={() => onEdit(schedule.id)}>
                            <Edit size={16}/>
                            Edit Schedule
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem className={"hover:bg-[#383838]"}>
                        <div className={"flex gap-2 items-center w-full hover:cursor-pointer"} onClick={() => onToggle(schedule.id, !schedule.enabled)}>
                            <ToggleLeft size={16}/>
                            {!schedule.enabled  ? "Enable" : "Disable"} Schedule
                        </div>
                    </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem className={"hover:bg-red-400/20"}>
                    <div className="flex gap-2 items-center text-red-400 hover:cursor-pointer w-full" onClick={() => onDelete(schedule.id)}>
                        <Delete size={16} className={"text-red-400"}/>
                        Delete
                    </div>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}